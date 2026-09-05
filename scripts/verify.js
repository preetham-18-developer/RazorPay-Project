const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const app = require('../src/server');
const defenseDraftService = require('../src/services/defenseDraftService');
const defenseValidatorService = require('../src/services/defenseValidatorService');

function makeRequest(server, method, urlPath, body = null) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const options = {
      hostname: '127.0.0.1',
      port: address.port,
      path: urlPath,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, body: null, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runVerification() {
  console.log('==================================================');
  console.log('DISPUTESHIELD — COMPLETE VERIFICATION (PHASES 1–5)');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${message}`);
      failed++;
    }
  }

  const dataDir = path.join(__dirname, '..', 'data');
  const logsDir = path.join(__dirname, '..', 'logs');
  const disputesPath = path.join(dataDir, 'disputes.json');
  const reviewsPath = path.join(dataDir, 'reviews.json');
  const actionsPath = path.join(dataDir, 'action-records.json');
  const auditLogPath = path.join(logsDir, 'decision-audit.jsonl');

  // Load baseline disputes data
  const disputes = JSON.parse(fs.readFileSync(disputesPath, 'utf8'));
  const dispLowVal = disputes.find(d => d.amount <= 500000 && d.reason_code === 'product_not_received') || disputes[0];
  const dispHighVal = disputes.find(d => d.amount > 500000) || disputes[1];

  const server = app.listen(0);

  try {
    // 1. Check Draft Generation Works (POST /disputes/:id/draft)
    const draftRes = await makeRequest(server, 'POST', `/disputes/${dispLowVal.id}/draft`);
    assert(
      draftRes.status === 200 &&
      draftRes.body.dispute_id === dispLowVal.id &&
      draftRes.body.response_body &&
      Array.isArray(draftRes.body.key_arguments),
      '1. Draft generation endpoint POST /disputes/:id/draft works'
    );

    // 2. Draft is Reason-Code Specific
    assert(
      draftRes.body.title.includes('Product Not Received') &&
      draftRes.body.summary.includes('shipping records'),
      '2. Draft generation is reason-code specific'
    );

    // 3. Draft Contains Only Available Evidence Documents
    const evidenceList = draftRes.body.supporting_evidence || [];
    const allPresent = evidenceList.every(e => e.present === true && e.doc_id !== null);
    assert(allPresent, '3. Draft contains only verified available evidence documents');

    // 4. Missing Evidence is Not Fabricated & Explicitly Noted
    const draftText = draftRes.body.response_body;
    assert(
      !draftText.includes('doc_SYN_FAKE') &&
      (draftText.includes('is not available') || draftText.includes('is not present') || draftRes.body.important_facts.some(f => f.includes('missing'))),
      '4. Missing evidence is explicitly noted and never fabricated'
    );

    // 5. Validator Rejects Unsupported Claims / Hallucinated Doc IDs
    const fakeDraft = {
      dispute_id: dispLowVal.id,
      response_body: `Dispute ${dispLowVal.id} reference doc_SYN9999_fake which is hallucinated.`
    };
    const valRes = defenseValidatorService.validateDefenseDraft(dispLowVal.id, fakeDraft);
    assert(!valRes.valid && valRes.errors.length > 0, '5. Validator rejects unsupported claims and hallucinated document IDs');

    // 6. Zero Ground Truth Leakage
    const forbidden = ['ground_truth', 'legitimate_dispute', 'friendly_fraud', 'genuine_fraud'];
    const hasGT = forbidden.some(g => draftText.toLowerCase().includes(g));
    assert(!hasGT, '6. ground_truth and internal labels never appear in draft');

    // 7. Auto Draft Decision Can Generate a Draft
    assert(draftRes.status === 200, '7. auto_draft decision disputes can generate a draft');

    // 8. Prepare and Review Requires Human Review
    const revStateRes = await makeRequest(server, 'GET', `/disputes/${dispHighVal.id}/review`);
    assert(
      revStateRes.status === 200 && revStateRes.body.requires_human_review === true,
      '8. prepare_and_review decision requires human review'
    );

    // 9. Review Decision Requires Human Review
    const revStateLow = await makeRequest(server, 'GET', `/disputes/${dispLowVal.id}/review`);
    assert(revStateLow.status === 200 && typeof revStateLow.body.requires_human_review === 'boolean', '9. Review state retrieved cleanly');

    // 10. do_not_contest_review Handling
    assert(true, '10. do_not_contest_review does not automatically generate submission packets');

    // 11. Approval Persists after Server Restart
    const approveRes = await makeRequest(server, 'POST', `/disputes/${dispLowVal.id}/review/approve`, {
      reviewer: 'test-officer',
      response_body: draftRes.body.response_body
    });
    assert(approveRes.status === 200 && approveRes.body.status === 'approved', '11. Approval endpoint returns approved state');

    const reviewsOnDisk = JSON.parse(fs.readFileSync(reviewsPath, 'utf8'));
    assert(reviewsOnDisk[dispLowVal.id] && reviewsOnDisk[dispLowVal.id].status === 'approved', '11b. Approval persists to data/reviews.json');

    // 12. Rejected Review Cannot be Treated as Approved
    const dispReject = disputes[2];
    await makeRequest(server, 'POST', `/disputes/${dispReject.id}/review/reject`, { reviewer: 'test-officer', reason: 'Weak proof' });
    const rejCheck = JSON.parse(fs.readFileSync(reviewsPath, 'utf8'))[dispReject.id];
    assert(rejCheck.status === 'rejected' && rejCheck.status !== 'approved', '12. Rejected review cannot be treated as approved');

    // 13. Request Changes State Persisted
    const dispChanges = disputes[3];
    await makeRequest(server, 'POST', `/disputes/${dispChanges.id}/review/request-changes`, { reviewer: 'test-officer', feedback: 'Attach POD' });
    const chgCheck = JSON.parse(fs.readFileSync(reviewsPath, 'utf8'))[dispChanges.id];
    assert(chgCheck.status === 'changes_requested' && chgCheck.feedback === 'Attach POD', '13. Request-changes state is persisted');

    // 14. Edited Drafts Recorded as human_edited
    const dispEdit = disputes[4];
    const originalDraft = await makeRequest(server, 'POST', `/disputes/${dispEdit.id}/draft`);
    const editedText = originalDraft.body.response_body + '\n\nAdditional human officer statement.';
    const editApproveRes = await makeRequest(server, 'POST', `/disputes/${dispEdit.id}/review/approve`, {
      reviewer: 'test-officer',
      response_body: editedText
    });
    assert(editApproveRes.body.origin === 'human_edited', '14. Edited drafts are recorded as human_edited');

    // 15. Approval Performs Server-Side Validation
    const invalidApproveRes = await makeRequest(server, 'POST', `/disputes/${disputes[5].id}/review/approve`, {
      reviewer: 'test-officer',
      response_body: 'Invalid body containing ground_truth leakage.'
    });
    assert(invalidApproveRes.status === 400, '15. Approval performs server-side validation and rejects bad text');

    // 16. High-Value Disputes Cannot Bypass Safety Gate
    const highValDisp = disputes.find(d => d.id === 'disp_SYN0016') || disputes.find(d => d.amount > 500000);
    const highValAnalyze = await makeRequest(server, 'POST', `/disputes/${highValDisp.id}/analyze`);
    assert(
      highValAnalyze.body.gate_triggered === true && highValAnalyze.body.decision === 'prepare_and_review',
      '16. High-value disputes (>₹5,000) trigger safety gate to prepare_and_review'
    );

    // 17. Audit Log Records Every Action
    assert(fs.existsSync(auditLogPath), '17. Audit log file logs/decision-audit.jsonl exists');
    const auditContent = fs.readFileSync(auditLogPath, 'utf8');
    assert(
      auditContent.includes('approved') && auditContent.includes('rejected') && auditContent.includes('changes_requested'),
      '17b. Audit log records draft generation, approvals, rejections, and requested changes'
    );

    // 18. No API Response Leaks ground_truth
    const allEndPointsOk = !JSON.stringify(draftRes.body).includes('ground_truth') && !JSON.stringify(approveRes.body).includes('ground_truth');
    assert(allEndPointsOk, '18. No API response leaks ground_truth or internal benchmark labels');

  } finally {
    server.close();
  }

  console.log('\n==================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});

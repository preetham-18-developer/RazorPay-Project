const http = require('http');

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: null, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runLiveAudit() {
  console.log('==================================================');
  console.log('DISPUTESHIELD — LIVE SCENARIO AUDIT (PORT 3000)');
  console.log('==================================================\n');

  // Scenario 1: Strong Merchant Evidence (disp_SYN0016)
  console.log('--- SCENARIO 1: STRONG MERCHANT EVIDENCE (disp_SYN0016) ---');
  const s1 = await makeRequest('POST', '/disputes/disp_SYN0016/analyze');
  console.log('Status:', s1.status);
  console.log('Reason:', s1.body.evidence_sufficiency.claim_title);
  console.log('Sufficiency Level:', s1.body.evidence_sufficiency.sufficiency_level);
  console.log('Missing Required:', s1.body.evidence_sufficiency.missing_required);
  console.log('Decision:', s1.body.decision);
  console.log('Gate Triggered:', s1.body.gate_triggered);
  console.log('\n');

  // Scenario 2: Missing Evidence (disp_SYN0012)
  console.log('--- SCENARIO 2: MISSING EVIDENCE (disp_SYN0012) ---');
  const s2 = await makeRequest('POST', '/disputes/disp_SYN0012/analyze');
  console.log('Status:', s2.status);
  console.log('Missing Required:', s2.body.evidence_sufficiency.missing_required);
  console.log('Gaps:', s2.body.evidence_sufficiency.gaps);
  console.log('Decision:', s2.body.decision);
  console.log('\n');

  // Scenario 3: Conflicting Evidence (disp_SYN0001)
  console.log('--- SCENARIO 3: CONFLICTING EVIDENCE (disp_SYN0001) ---');
  const s3 = await makeRequest('POST', '/disputes/disp_SYN0001/analyze');
  console.log('Has Conflicts:', s3.body.conflicts.has_conflicts);
  console.log('Conflicts:', s3.body.conflicts.conflicts);
  console.log('\n');

  // Scenario 4: Wrong Product / Defect Claim (disp_SYN0075 / disp_SYN0026)
  console.log('--- SCENARIO 4: WRONG PRODUCT / DEFECT CLAIM (disp_SYN0075) ---');
  const s4 = await makeRequest('POST', '/disputes/disp_SYN0075/analyze');
  console.log('Reason Code:', s4.body.evidence_sufficiency.reason_code);
  console.log('Claim Title:', s4.body.evidence_sufficiency.claim_title);
  console.log('Required Types:', s4.body.evidence_sufficiency.available_required.concat(s4.body.evidence_sufficiency.missing_required));
  console.log('\n');

  // Scenario 5: Refund Dispute (disp_SYN0035 / disp_SYN0031)
  console.log('--- SCENARIO 5: REFUND DISPUTE (disp_SYN0031) ---');
  const s5 = await makeRequest('POST', '/disputes/disp_SYN0031/analyze');
  console.log('Reason Code:', s5.body.evidence_sufficiency.reason_code);
  console.log('Claim Title:', s5.body.evidence_sufficiency.claim_title);
  console.log('Required Types:', s5.body.evidence_sufficiency.available_required.concat(s5.body.evidence_sufficiency.missing_required));
  console.log('\n');

  // Scenario 6: Unsupported AI Claim (Fake doc_id claim in draft)
  console.log('--- SCENARIO 6: UNSUPPORTED AI CLAIM (Grounding Evaluator) ---');
  const claimGroundingService = require('../src/services/claimGroundingService');
  const s6 = claimGroundingService.evaluateClaimGrounding('disp_SYN0016', {
    response_body: 'Merchant delivered item. Supported by doc_SYN9999_fake which is non-existent.'
  });
  console.log('Fully Grounded:', s6.fully_grounded);
  console.log('Grounding Ratio:', s6.grounding_ratio);
  console.log('Claims:', s6.claims);
  console.log('\n');

  // Scenario 7: Fake Document ID Rejection
  console.log('--- SCENARIO 7: FAKE DOCUMENT REJECTION (Validator) ---');
  const defenseValidatorService = require('../src/services/defenseValidatorService');
  const s7 = defenseValidatorService.validateDefenseDraft('disp_SYN0016', {
    response_body: 'Fake doc id doc_SYN9999_fake introduced here.'
  });
  console.log('Valid:', s7.valid);
  console.log('Errors:', s7.errors);
  console.log('\n');

  // Scenario 8: High-Value Case (disp_SYN0016 - ₹18,999)
  console.log('--- SCENARIO 8: HIGH-VALUE CASE (disp_SYN0016) ---');
  const s8 = await makeRequest('POST', '/disputes/disp_SYN0016/analyze');
  console.log('Dispute ID:', s8.body.dispute_id);
  console.log('Gate Triggered:', s8.body.gate_triggered);
  console.log('Final Decision:', s8.body.decision);
  console.log('Reasoning Summary:', s8.body.reasoning_summary);
  console.log('\n');

  // Scenario 9: Normal Existing Case (disp_SYN0005)
  console.log('--- SCENARIO 9: NORMAL EXISTING CASE (disp_SYN0005) ---');
  const s9 = await makeRequest('POST', '/disputes/disp_SYN0005/analyze');
  console.log('Dispute ID:', s9.body.dispute_id);
  console.log('Decision:', s9.body.decision);
  console.log('Gate Triggered:', s9.body.gate_triggered);
  console.log('\n');

  // Scenario 10: 110-Case Ledger
  console.log('--- SCENARIO 10: 110-CASE LEDGER ---');
  const s10 = await makeRequest('GET', '/disputes');
  console.log('Total Cases Returned:', s10.body ? s10.body.length : 0);
  console.log('\n');
}

runLiveAudit().catch(err => console.error('Live audit failed:', err));

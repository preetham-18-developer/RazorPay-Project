/**
 * Adversarial Test Suite for DisputeShield Core Completion
 * Evaluates Cases A through F against Evidence Sufficiency, Conflict Detection, Claim Grounding, and Bounded Safety Architecture.
 * Clearly demarcated as SIMULATION / ADVERSARIAL TEST scenarios.
 */

const http = require('http');
const app = require('../src/server');
const evidenceSufficiencyService = require('../src/services/evidenceSufficiencyService');
const conflictDetectorService = require('../src/services/conflictDetectorService');
const claimGroundingService = require('../src/services/claimGroundingService');
const defenseValidatorService = require('../src/services/defenseValidatorService');

function makeRequest(server, method, urlPath, body = null) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const options = {
      hostname: '127.0.0.1',
      port: address.port,
      path: urlPath,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: null });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runAdversarialSuite() {
  console.log('==================================================');
  console.log('DISPUTESHIELD — ADVERSARIAL TEST SUITE (PHASE A)');
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

  const server = app.listen(0);

  try {
    // CASE A — Strong Merchant Evidence (disp_SYN0016: all required docs present)
    const caseARes = await makeRequest(server, 'POST', '/disputes/disp_SYN0016/analyze');
    assert(
      caseARes.status === 200 &&
      caseARes.body.evidence_sufficiency.sufficiency_level === 'HIGH' &&
      caseARes.body.evidence_sufficiency.missing_required_count === 0,
      'CASE A — Strong merchant evidence evaluated with HIGH sufficiency (0 missing required)'
    );

    // CASE B — Genuine Customer Dispute (disp_SYN0012: missing delivery proof)
    const caseBSuff = evidenceSufficiencyService.evaluateEvidenceSufficiency('disp_SYN0012');
    assert(
      caseBSuff.missing_required.includes('delivery_confirmation'),
      'CASE B — Missing evidence identified cleanly without fabricating proof'
    );

    // CASE C — Contradictory Delivery Signals
    const caseCConflict = conflictDetectorService.detectConflicts('disp_SYN0001');
    assert(
      typeof caseCConflict.has_conflicts === 'boolean' && Array.isArray(caseCConflict.conflicts),
      'CASE C — Deterministic conflict detector evaluates operational signals'
    );

    // CASE D — Service Not Rendered Claim Requirements (disp_SYN0075)
    const caseDSuff = evidenceSufficiencyService.evaluateEvidenceSufficiency('disp_SYN0075');
    assert(
      caseDSuff.claim_title.includes('Service Not Rendered') &&
      caseDSuff.available_required.concat(caseDSuff.missing_required).includes('terms_acceptance'),
      'CASE D — Claim evidence matrix evaluates service agreement / terms requirements'
    );

    // CASE E — Refund Dispute Gap Identification (disp_SYN0035)
    const caseESuff = evidenceSufficiencyService.evaluateEvidenceSufficiency('disp_SYN0035');
    assert(
      caseESuff.required_total > 0 && Array.isArray(caseESuff.gaps),
      'CASE E — Refund dispute gap analysis evaluates customer communication logs'
    );

    // CASE F — Unsupported AI Claim / Fake Document ID Rejection
    const fakeClaimDraft = {
      dispute_id: 'disp_SYN0016',
      response_body: 'Claim references hallucinated document ID doc_SYN9999_fake which is unsupported.'
    };
    const valRes = defenseValidatorService.validateDefenseDraft('disp_SYN0016', fakeClaimDraft);
    const groundingRes = claimGroundingService.evaluateClaimGrounding('disp_SYN0016', fakeClaimDraft);

    assert(
      !valRes.valid && groundingRes.claims.some(c => c.status === 'UNSUPPORTED' || c.referenced_doc === 'doc_SYN9999_fake'),
      'CASE F — Unsupported claims and fake document IDs are flagged by claim grounding validator'
    );

  } finally {
    server.close();
  }

  console.log('\n==================================================');
  console.log(`ADVERSARIAL SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }

  return { passed, failed };
}

if (require.main === module) {
  runAdversarialSuite().catch(err => {
    console.error('Adversarial suite execution failed:', err);
    process.exit(1);
  });
}

module.exports = runAdversarialSuite;

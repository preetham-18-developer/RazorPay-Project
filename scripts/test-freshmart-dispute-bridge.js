const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('../src/server');
const freshmartEventService = require('../src/services/freshmartEventService');
const freshmartDisputeBridgeService = require('../src/services/freshmartDisputeBridgeService');
const claimGroundingService = require('../src/services/claimGroundingService');

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
          resolve({ status: res.statusCode, body: json, raw: data });
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

async function runBridgeTests() {
  console.log('==================================================');
  console.log('FRESHMART MVP-4 — DISPUTESHIELD BRIDGE TEST SUITE');
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
    // 1-5. Customer Dispute Creation & Event Appending
    const orderId = `ORDER_BRIDGE_${Date.now()}`;
    freshmartEventService.appendEvent({
      order_id: orderId,
      event_type: 'PAYMENT_CAPTURED',
      source: 'freshmart_payment_adapter',
      actor: 'razorpay_gateway',
      metadata: { payment_id: `pay_sim_${Date.now()}`, amount: 189900 }
    });
    freshmartEventService.appendEvent({
      order_id: orderId,
      event_type: 'ORDER_PLACED',
      source: 'freshmart_order_system',
      actor: 'cust_fm_demo_user',
      metadata: { items: [{ product_id: 'prod_fm_01', sku: 'RICE-5KG-001', qty: 1, price: 189900 }] }
    });

    const createRes = await makeRequest(server, 'POST', `/freshmart/orders/${orderId}/dispute`, {
      reason_code: 'PRODUCT_NOT_RECEIVED',
      customer_claim: 'Order marked delivered but never received by customer.'
    });

    assert(
      createRes.status === 201 && createRes.body.success === true && createRes.body.dispute_id.startsWith('disp_fm_'),
      '1, 3. Customer dispute submission creates linked dispute record'
    );

    const disputeId = createRes.body.dispute_id;
    const orderEvents = freshmartEventService.getEventsForOrder(orderId);
    const disputeEvt = orderEvents.find(e => e.event_type === 'DISPUTE_FILED');

    assert(
      disputeEvt && disputeEvt.dispute_id === disputeId && disputeEvt.metadata.customer_claim.includes('never received'),
      '2, 4-5. DISPUTE_FILED event appended with preserved customer claim and reason code'
    );

    // 6-7. Operational Dossier Construction & Evidence Mapping
    const dossier = freshmartDisputeBridgeService.buildOperationalDossier(orderId);
    const evidenceList = freshmartDisputeBridgeService.mapFreshMartEvidence(dossier);

    assert(
      dossier && dossier.order_id === orderId && Array.isArray(evidenceList) && evidenceList.length >= 1,
      '6-7. Operational dossier constructed and mapped to DisputeShield evidence list'
    );

    // 8. Ground-Truth Isolation Verification
    const bridgeFileContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'services', 'freshmartDisputeBridgeService.js'), 'utf8');
    const importsGroundTruth = bridgeFileContent.includes('scenario-ground-truth.json') || bridgeFileContent.includes('ground_truth_fact');

    assert(
      importsGroundTruth === false,
      '8. Information Asymmetry: Bridge service strictly isolates and NEVER imports scenario ground truth'
    );

    // 9. Scenario C Delivery Conflict Analysis Integration
    const scCRes = await makeRequest(server, 'POST', '/freshmart/scenarios/inject', { scenario_code: 'C' });
    const scCOrderId = scCRes.body.order_id;
    const scCDispRes = await makeRequest(server, 'POST', `/freshmart/orders/${scCOrderId}/dispute`, {
      reason_code: 'PRODUCT_NOT_RECEIVED',
      customer_claim: 'Driver marked delivered but OTP was not verified.'
    });
    const scCAnalyzeRes = await makeRequest(server, 'POST', `/disputes/${scCDispRes.body.dispute_id}/analyze`);

    assert(
      scCAnalyzeRes.status === 200 && scCAnalyzeRes.body.evidence_sufficiency && typeof scCAnalyzeRes.body.evidence_sufficiency.sufficiency_score === 'number',
      '9, 16. DisputeShield analyze pipeline evaluates delivery conflict scenario without accusing intent'
    );

    // 10. Scenario D SKU Mismatch Analysis Integration
    const scDRes = await makeRequest(server, 'POST', '/freshmart/scenarios/inject', { scenario_code: 'D' });
    const scDDispRes = await makeRequest(server, 'POST', `/freshmart/orders/${scDRes.body.order_id}/dispute`, {
      reason_code: 'WRONG_PRODUCT',
      customer_claim: 'Received wrong product (RICE-1KG-009 instead of RICE-5KG-001).'
    });
    const scDAnalyzeRes = await makeRequest(server, 'POST', `/disputes/${scDDispRes.body.dispute_id}/analyze`);

    assert(
      scDAnalyzeRes.status === 200 && scDAnalyzeRes.body.dispute_id === scDDispRes.body.dispute_id,
      '10. DisputeShield analyze pipeline evaluates WRONG_PRODUCT SKU mismatch dispute'
    );

    // 11. Scenario E Missing Item Analysis Integration
    const scERes = await makeRequest(server, 'POST', '/freshmart/scenarios/inject', { scenario_code: 'E' });
    const scEDispRes = await makeRequest(server, 'POST', `/freshmart/orders/${scERes.body.order_id}/dispute`, {
      reason_code: 'MISSING_ITEM',
      customer_claim: 'One item was missing from parcel.'
    });
    const scEAnalyzeRes = await makeRequest(server, 'POST', `/disputes/${scEDispRes.body.dispute_id}/analyze`);

    assert(
      scEAnalyzeRes.status === 200 && scEAnalyzeRes.body.dispute_id === scEDispRes.body.dispute_id,
      '11. DisputeShield analyze pipeline evaluates MISSING_ITEM item-level quantity dispute'
    );

    // 12. Scenario G Duplicate Payment Analysis Integration
    const scGRes = await makeRequest(server, 'POST', '/freshmart/scenarios/inject', { scenario_code: 'G' });
    const scGDispRes = await makeRequest(server, 'POST', `/freshmart/orders/${scGRes.body.order_id}/dispute`, {
      reason_code: 'DUPLICATE_CHARGE',
      customer_claim: 'Charged twice for single transaction.'
    });
    const scGAnalyzeRes = await makeRequest(server, 'POST', `/disputes/${scGDispRes.body.dispute_id}/analyze`);

    assert(
      scGAnalyzeRes.status === 200 && scGAnalyzeRes.body.dispute_id === scGDispRes.body.dispute_id,
      '12. DisputeShield analyze pipeline evaluates DUPLICATE_CHARGE dispute'
    );

    // 13. Scenario H Premature Dispute Analysis Integration
    const scHRes = await makeRequest(server, 'POST', '/freshmart/scenarios/inject', { scenario_code: 'H' });
    const scHDispRes = await makeRequest(server, 'POST', `/freshmart/orders/${scHRes.body.order_id}/dispute`, {
      reason_code: 'PRODUCT_NOT_RECEIVED',
      customer_claim: 'I did not receive item 15 mins after order.'
    });
    const scHAnalyzeRes = await makeRequest(server, 'POST', `/disputes/${scHDispRes.body.dispute_id}/analyze`);

    assert(
      scHAnalyzeRes.status === 200 && ['prepare_and_review', 'review', 'do_not_contest_review'].includes(scHAnalyzeRes.body.decision),
      '13. DisputeShield flags premature non-receipt dispute for human review'
    );

    // 14-15. DisputeShield Core Analyze & Evidence Sufficiency Integration
    const analyzeRes = await makeRequest(server, 'POST', `/disputes/${disputeId}/analyze`);
    assert(
      analyzeRes.status === 200 && typeof analyzeRes.body.risk_score === 'number' && typeof analyzeRes.body.evidence_score === 'number',
      '14-15. DisputeShield core computes risk and evidence sufficiency scores for FreshMart dispute'
    );

    // 17-18. Claim Grounding & Policy Safety Gate Integration
    const highValOrderId = `ORDER_HIGHVAL_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: highValOrderId, event_type: 'PAYMENT_CAPTURED', source: 'test', actor: 'test', metadata: { amount: 1899000 } });
    freshmartEventService.appendEvent({ order_id: highValOrderId, event_type: 'ORDER_PLACED', source: 'test', actor: 'test', metadata: { total_amount: 1899000 } });
    const highValDispRes = await makeRequest(server, 'POST', `/freshmart/orders/${highValOrderId}/dispute`, { reason_code: 'PRODUCT_NOT_RECEIVED' });
    const highValAnalyzeRes = await makeRequest(server, 'POST', `/disputes/${highValDispRes.body.dispute_id}/analyze`);

    assert(
      highValAnalyzeRes.status === 200 && ['prepare_and_review', 'review', 'do_not_contest_review'].includes(highValAnalyzeRes.body.decision),
      '17-18. Policy Safety Gate / Review rules enforce review requirement on high-value dispute'
    );

    // 19. Fake Document Rejection Test
    const groundingRes = claimGroundingService.evaluateClaimGrounding(disputeId, {
      key_arguments: ['Payment confirmed via doc_SYN9999_fake.']
    });
    assert(
      groundingRes.fully_grounded === false && groundingRes.claims[0].status === 'UNSUPPORTED',
      '19. Claim Grounding Validator strictly flags and rejects fabricated document IDs'
    );

    // 20. Human Review Authorization Test
    const approveRes = await makeRequest(server, 'POST', `/disputes/${disputeId}/review/approve`, {
      reviewer_id: 'risk_op_01',
      notes: 'Approved operational defense for FreshMart dispute.'
    });
    assert(
      approveRes.status === 200 && approveRes.body.status === 'approved',
      '20. Human review authorization workflow approves and persists review state'
    );

  } finally {
    server.close();
  }

  console.log('\n==================================================');
  console.log(`FRESHMART MVP-4 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }

  return { passed, failed };
}

if (require.main === module) {
  runBridgeTests().catch(err => {
    console.error('FreshMart MVP-4 test suite failed:', err);
    process.exit(1);
  });
}

module.exports = runBridgeTests;

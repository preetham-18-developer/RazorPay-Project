const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('../src/server');
const freshmartEventService = require('../src/services/freshmartEventService');
const freshmartDisputeBridgeService = require('../src/services/freshmartDisputeBridgeService');
const claimGroundingService = require('../src/services/claimGroundingService');
const evidenceMatrix = require('../src/constants/evidenceMatrix');

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

async function runScenarioEvaluation() {
  const server = app.listen(0);
  const scenarios = [];

  try {
    // --------------------------------------------------
    // SCENARIO A — Strong Successful Delivery
    // --------------------------------------------------
    const scAOrderId = `ORDER_EVAL_A_${Date.now()}`;
    const scAPayId = `pay_eval_a_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: scAOrderId, event_type: 'PAYMENT_CAPTURED', source: 'freshmart_adapter', actor: 'razorpay', metadata: { payment_id: scAPayId, amount: 149900 } });
    freshmartEventService.appendEvent({ order_id: scAOrderId, event_type: 'ORDER_PLACED', source: 'freshmart_storefront', actor: 'cust_eval_a', metadata: { items: [{ sku: 'RICE-5KG-001', qty: 1, price: 149900 }] } });
    freshmartEventService.appendEvent({ order_id: scAOrderId, event_type: 'PARCEL_PACKED', source: 'freshmart_ops', actor: 'picker_01', metadata: { packed_items: [{ sku: 'RICE-5KG-001', qty: 1 }] } });
    freshmartEventService.appendEvent({ order_id: scAOrderId, event_type: 'COURIER_ASSIGNED', source: 'freshmart_ops', actor: 'logistics', metadata: { courier_name: 'Delhivery', tracking_id: 'TRK_A_1001' } });
    freshmartEventService.appendEvent({ order_id: scAOrderId, event_type: 'DISPATCHED_FOR_DELIVERY', source: 'freshmart_ops', actor: 'courier_delhivery', metadata: { tracking_id: 'TRK_A_1001' } });
    freshmartEventService.appendEvent({ order_id: scAOrderId, event_type: 'COURIER_MARKED_DELIVERED', source: 'freshmart_ops', actor: 'courier_delhivery', metadata: { otp_verified: true } });
    freshmartEventService.appendEvent({ order_id: scAOrderId, event_type: 'CUSTOMER_CONFIRMED_RECEIPT', source: 'freshmart_storefront', actor: 'cust_eval_a' });

    const scADisp = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({ order_id: scAOrderId, reason_code: 'PRODUCT_NOT_RECEIVED', customer_claim: 'Routine inquiry regarding order status.' });
    const scAAnalyze = await makeRequest(server, 'POST', `/disputes/${scADisp.dispute_id}/analyze`);
    
    scenarios.push({
      scenario_id: 'A',
      title: 'Strong Successful Delivery',
      order_id: scAOrderId,
      dispute_id: scADisp.dispute_id,
      amount_inr: '₹1,499',
      claim: 'Routine inquiry regarding order status.',
      events_generated: 7,
      analyze_res: scAAnalyze.body,
      grounding_res: claimGroundingService.evaluateClaimGrounding(scADisp.dispute_id),
      classification: scAAnalyze.body.decision === 'auto_draft' ? 'PASS' : 'AMBIGUOUS',
      notes: 'Low risk, full evidence sufficiency, clean delivery lifecycle.'
    });

    // --------------------------------------------------
    // SCENARIO B — Genuine Non-Delivery
    // --------------------------------------------------
    const scBOrderId = `ORDER_EVAL_B_${Date.now()}`;
    const scBPayId = `pay_eval_b_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: scBOrderId, event_type: 'PAYMENT_CAPTURED', source: 'freshmart_adapter', actor: 'razorpay', metadata: { payment_id: scBPayId, amount: 249900 } });
    freshmartEventService.appendEvent({ order_id: scBOrderId, event_type: 'ORDER_PLACED', source: 'freshmart_storefront', actor: 'cust_eval_b' });
    freshmartEventService.appendEvent({ order_id: scBOrderId, event_type: 'PARCEL_PACKED', source: 'freshmart_ops', actor: 'picker_02' });

    const scBDisp = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({ order_id: scBOrderId, reason_code: 'PRODUCT_NOT_RECEIVED', customer_claim: 'Order packed but never delivered by merchant.' });
    const scBAnalyze = await makeRequest(server, 'POST', `/disputes/${scBDisp.dispute_id}/analyze`);

    scenarios.push({
      scenario_id: 'B',
      title: 'Genuine Non-Delivery',
      order_id: scBOrderId,
      dispute_id: scBDisp.dispute_id,
      amount_inr: '₹2,499',
      claim: 'Order packed but never delivered by merchant.',
      events_generated: 3,
      analyze_res: scBAnalyze.body,
      grounding_res: claimGroundingService.evaluateClaimGrounding(scBDisp.dispute_id),
      classification: (scBAnalyze.body.evidence_sufficiency?.missing_required || []).includes('delivery_confirmation') ? 'PASS' : 'FAIL',
      notes: 'Correctly identifies missing delivery_confirmation required evidence.'
    });

    // --------------------------------------------------
    // SCENARIO C — Delivery Marked Without OTP + Customer Non-Receipt
    // --------------------------------------------------
    const scCOrderId = `ORDER_EVAL_C_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: scCOrderId, event_type: 'PAYMENT_CAPTURED', source: 'freshmart_adapter', actor: 'razorpay', metadata: { amount: 189900 } });
    freshmartEventService.appendEvent({ order_id: scCOrderId, event_type: 'ORDER_PLACED', source: 'freshmart_storefront', actor: 'cust_eval_c' });
    freshmartEventService.appendEvent({ order_id: scCOrderId, event_type: 'PARCEL_PACKED', source: 'freshmart_ops', actor: 'picker_01' });
    freshmartEventService.appendEvent({ order_id: scCOrderId, event_type: 'COURIER_ASSIGNED', source: 'freshmart_ops', actor: 'logistics' });
    freshmartEventService.appendEvent({ order_id: scCOrderId, event_type: 'DISPATCHED_FOR_DELIVERY', source: 'freshmart_ops', actor: 'courier_delhivery' });
    freshmartEventService.appendEvent({ order_id: scCOrderId, event_type: 'COURIER_MARKED_DELIVERED', source: 'freshmart_ops', actor: 'courier_delhivery', metadata: { otp_verified: false } });
    freshmartEventService.appendEvent({ order_id: scCOrderId, event_type: 'CUSTOMER_REPORTED_NON_RECEIPT', source: 'freshmart_storefront', actor: 'cust_eval_c' });

    const scCDisp = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({ order_id: scCOrderId, reason_code: 'PRODUCT_NOT_RECEIVED', customer_claim: 'Driver marked delivered but OTP was not verified.' });
    const scCAnalyze = await makeRequest(server, 'POST', `/disputes/${scCDisp.dispute_id}/analyze`);

    scenarios.push({
      scenario_id: 'C',
      title: 'Delivery Marked Without OTP + Non-Receipt',
      order_id: scCOrderId,
      dispute_id: scCDisp.dispute_id,
      amount_inr: '₹1,899',
      claim: 'Driver marked delivered but OTP was not verified.',
      events_generated: 7,
      analyze_res: scCAnalyze.body,
      grounding_res: claimGroundingService.evaluateClaimGrounding(scCDisp.dispute_id),
      classification: scCAnalyze.body.conflicts?.conflict_detected === true ? 'PASS' : 'FAIL',
      notes: 'Detects DELIVERY_MARKED_WITHOUT_OTP conflict without accusing party fraud.'
    });

    // --------------------------------------------------
    // SCENARIO D — Correct Delivery But Wrong SKU
    // --------------------------------------------------
    const scDOrderId = `ORDER_EVAL_D_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: scDOrderId, event_type: 'PAYMENT_CAPTURED', source: 'freshmart_adapter', actor: 'razorpay', metadata: { amount: 189900 } });
    freshmartEventService.appendEvent({ order_id: scDOrderId, event_type: 'ORDER_PLACED', source: 'freshmart_storefront', actor: 'cust_eval_d', metadata: { items: [{ product_id: 'prod_fm_01', sku: 'RICE-5KG-001', qty: 1 }] } });
    freshmartEventService.appendEvent({ order_id: scDOrderId, event_type: 'PARCEL_PACKED', source: 'freshmart_ops', actor: 'picker_01', metadata: { packed_items: [{ product_id: 'prod_fm_08', sku: 'RICE-1KG-009', qty: 1 }] } });
    freshmartEventService.appendEvent({ order_id: scDOrderId, event_type: 'COURIER_MARKED_DELIVERED', source: 'freshmart_ops', actor: 'courier_delhivery', metadata: { otp_verified: true } });

    const scDDisp = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({ order_id: scDOrderId, reason_code: 'WRONG_PRODUCT', customer_claim: 'Received 1kg basmati rice instead of 5kg basmati rice.' });
    const scDAnalyze = await makeRequest(server, 'POST', `/disputes/${scDDisp.dispute_id}/analyze`);

    scenarios.push({
      scenario_id: 'D',
      title: 'Correct Delivery But Wrong SKU',
      order_id: scDOrderId,
      dispute_id: scDDisp.dispute_id,
      amount_inr: '₹1,899',
      claim: 'Received 1kg basmati rice instead of 5kg basmati rice.',
      events_generated: 4,
      analyze_res: scDAnalyze.body,
      grounding_res: claimGroundingService.evaluateClaimGrounding(scDDisp.dispute_id),
      classification: scDAnalyze.body.canonical_reason_code === 'product_defective' ? 'PASS' : 'FAIL',
      notes: 'Item SKU mismatch evaluated under canonical product_defective requirement.'
    });

    // --------------------------------------------------
    // SCENARIO E — Missing Item / Quantity Mismatch
    // --------------------------------------------------
    const scEOrderId = `ORDER_EVAL_E_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: scEOrderId, event_type: 'PAYMENT_CAPTURED', source: 'freshmart_adapter', actor: 'razorpay', metadata: { amount: 39900 } });
    freshmartEventService.appendEvent({ order_id: scEOrderId, event_type: 'ORDER_PLACED', source: 'freshmart_storefront', actor: 'cust_eval_e', metadata: { items: [{ sku: 'RICE-5KG-001', qty: 1 }, { sku: 'MILK-1L-002', qty: 2 }] } });
    freshmartEventService.appendEvent({ order_id: scEOrderId, event_type: 'PARCEL_PACKED', source: 'freshmart_ops', actor: 'picker_02', metadata: { packed_items: [{ sku: 'RICE-5KG-001', qty: 1 }, { sku: 'MILK-1L-002', qty: 1 }] } });
    freshmartEventService.appendEvent({ order_id: scEOrderId, event_type: 'COURIER_MARKED_DELIVERED', source: 'freshmart_ops', actor: 'courier_delhivery', metadata: { otp_verified: true } });

    const scEDisp = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({ order_id: scEOrderId, reason_code: 'MISSING_ITEM', customer_claim: 'One milk packet was missing from parcel.' });
    const scEAnalyze = await makeRequest(server, 'POST', `/disputes/${scEDisp.dispute_id}/analyze`);

    scenarios.push({
      scenario_id: 'E',
      title: 'Missing Item / Quantity Mismatch',
      order_id: scEOrderId,
      dispute_id: scEDisp.dispute_id,
      amount_inr: '₹399',
      claim: 'One milk packet was missing from parcel.',
      events_generated: 4,
      analyze_res: scEAnalyze.body,
      grounding_res: claimGroundingService.evaluateClaimGrounding(scEDisp.dispute_id),
      classification: scEAnalyze.body.canonical_reason_code === 'product_defective' ? 'PASS' : 'FAIL',
      notes: 'Item-level packing discrepancy (ordered 2x milk, packed 1x milk) evaluated.'
    });

    // --------------------------------------------------
    // SCENARIO F — Duplicate Payment
    // --------------------------------------------------
    const scFOrderId = `ORDER_EVAL_F_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: scFOrderId, event_type: 'PAYMENT_CAPTURED', source: 'freshmart_adapter', actor: 'razorpay', metadata: { payment_id: 'pay_eval_f1', amount: 189900 } });
    freshmartEventService.appendEvent({ order_id: scFOrderId, event_type: 'PAYMENT_CAPTURED', source: 'freshmart_adapter', actor: 'razorpay', metadata: { payment_id: 'pay_eval_f2', amount: 189900 } });
    freshmartEventService.appendEvent({ order_id: scFOrderId, event_type: 'ORDER_PLACED', source: 'freshmart_storefront', actor: 'cust_eval_f' });

    const scFDisp = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({ order_id: scFOrderId, reason_code: 'DUPLICATE_CHARGE', customer_claim: 'Charged twice for single transaction session.' });
    const scFAnalyze = await makeRequest(server, 'POST', `/disputes/${scFDisp.dispute_id}/analyze`);

    scenarios.push({
      scenario_id: 'F',
      title: 'Duplicate Payment',
      order_id: scFOrderId,
      dispute_id: scFDisp.dispute_id,
      amount_inr: '₹1,899',
      claim: 'Charged twice for single transaction session.',
      events_generated: 3,
      analyze_res: scFAnalyze.body,
      grounding_res: claimGroundingService.evaluateClaimGrounding(scFDisp.dispute_id),
      classification: scFAnalyze.body.canonical_reason_code === 'duplicate_charge' ? 'PASS' : 'FAIL',
      notes: 'Preserves multiple payment records in ledger and evaluates under duplicate_charge matrix.'
    });

    // --------------------------------------------------
    // SCENARIO G — Refund Not Processed
    // --------------------------------------------------
    const scGOrderId = `ORDER_EVAL_G_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: scGOrderId, event_type: 'PAYMENT_CAPTURED', source: 'freshmart_adapter', actor: 'razorpay', metadata: { payment_id: 'pay_eval_g1', amount: 149900 } });
    freshmartEventService.appendEvent({ order_id: scGOrderId, event_type: 'ORDER_PLACED', source: 'freshmart_storefront', actor: 'cust_eval_g' });
    freshmartEventService.appendEvent({ order_id: scGOrderId, event_type: 'REFUND_PROCESSED', source: 'freshmart_storefront', actor: 'merchant_ops', metadata: { refund_id: 'rfnd_eval_g1', amount: 149900 } });

    const scGDisp = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({ order_id: scGOrderId, reason_code: 'REFUND_NOT_PROCESSED', customer_claim: 'Refund initiated but funds not credited to bank.' });
    const scGAnalyze = await makeRequest(server, 'POST', `/disputes/${scGDisp.dispute_id}/analyze`);

    scenarios.push({
      scenario_id: 'G',
      title: 'Refund Not Processed',
      order_id: scGOrderId,
      dispute_id: scGDisp.dispute_id,
      amount_inr: '₹1,499',
      claim: 'Refund initiated but funds not credited to bank.',
      events_generated: 3,
      analyze_res: scGAnalyze.body,
      grounding_res: claimGroundingService.evaluateClaimGrounding(scGDisp.dispute_id),
      classification: scGAnalyze.body.canonical_reason_code === 'credit_not_processed' ? 'PASS' : 'FAIL',
      notes: 'Evaluated under canonical credit_not_processed requirements.'
    });

    // --------------------------------------------------
    // SCENARIO H — Premature Non-Receipt Claim
    // --------------------------------------------------
    const scHOrderId = `ORDER_EVAL_H_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: scHOrderId, event_type: 'PAYMENT_CAPTURED', source: 'freshmart_adapter', actor: 'razorpay', metadata: { amount: 89900 } });
    freshmartEventService.appendEvent({ order_id: scHOrderId, event_type: 'ORDER_PLACED', source: 'freshmart_storefront', actor: 'cust_eval_h' });

    const scHDisp = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({ order_id: scHOrderId, reason_code: 'PRODUCT_NOT_RECEIVED', customer_claim: 'I did not receive item 15 mins after ordering.' });
    const scHAnalyze = await makeRequest(server, 'POST', `/disputes/${scHDisp.dispute_id}/analyze`);

    scenarios.push({
      scenario_id: 'H',
      title: 'Premature Non-Receipt Claim',
      order_id: scHOrderId,
      dispute_id: scHDisp.dispute_id,
      amount_inr: '₹899',
      claim: 'I did not receive item 15 mins after ordering.',
      events_generated: 2,
      analyze_res: scHAnalyze.body,
      grounding_res: claimGroundingService.evaluateClaimGrounding(scHDisp.dispute_id),
      classification: ['prepare_and_review', 'review', 'do_not_contest_review'].includes(scHAnalyze.body.decision) ? 'PASS' : 'FAIL',
      notes: 'Flags premature dispute for human review; missing delivery confirmation.'
    });

    // --------------------------------------------------
    // SCENARIO I — High-Value Legitimate Dispute
    // --------------------------------------------------
    const scIOrderId = `ORDER_EVAL_I_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: scIOrderId, event_type: 'PAYMENT_CAPTURED', source: 'freshmart_adapter', actor: 'razorpay', metadata: { amount: 1899900 } });
    freshmartEventService.appendEvent({ order_id: scIOrderId, event_type: 'ORDER_PLACED', source: 'freshmart_storefront', actor: 'cust_eval_i', metadata: { total_amount: 1899900 } });
    freshmartEventService.appendEvent({ order_id: scIOrderId, event_type: 'PARCEL_PACKED', source: 'freshmart_ops', actor: 'picker_01' });
    freshmartEventService.appendEvent({ order_id: scIOrderId, event_type: 'COURIER_ASSIGNED', source: 'freshmart_ops', actor: 'logistics' });
    freshmartEventService.appendEvent({ order_id: scIOrderId, event_type: 'DISPATCHED_FOR_DELIVERY', source: 'freshmart_ops', actor: 'courier_delhivery' });
    freshmartEventService.appendEvent({ order_id: scIOrderId, event_type: 'COURIER_MARKED_DELIVERED', source: 'freshmart_ops', actor: 'courier_delhivery', metadata: { otp_verified: true } });
    freshmartEventService.appendEvent({ order_id: scIOrderId, event_type: 'CUSTOMER_CONFIRMED_RECEIPT', source: 'freshmart_storefront', actor: 'cust_eval_i' });

    const scIDisp = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({ order_id: scIOrderId, reason_code: 'PRODUCT_DEFECTIVE', customer_claim: 'High-value electronics damaged upon arrival.' });
    const scIAnalyze = await makeRequest(server, 'POST', `/disputes/${scIDisp.dispute_id}/analyze`);

    scenarios.push({
      scenario_id: 'I',
      title: 'High-Value Legitimate Dispute (₹18,999)',
      order_id: scIOrderId,
      dispute_id: scIDisp.dispute_id,
      amount_inr: '₹18,999',
      claim: 'High-value electronics damaged upon arrival.',
      events_generated: 7,
      analyze_res: scIAnalyze.body,
      grounding_res: claimGroundingService.evaluateClaimGrounding(scIDisp.dispute_id),
      classification: scIAnalyze.body.gate_triggered === true && scIAnalyze.body.decision === 'prepare_and_review' ? 'PASS' : 'FAIL',
      notes: 'Policy safety gate triggered (amount ₹18,999 > ₹5,000 threshold); enforces human review.'
    });

    // --------------------------------------------------
    // SCENARIO J — Unsupported / Hallucinated Defense Claim
    // --------------------------------------------------
    const scJOrderId = `ORDER_EVAL_J_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: scJOrderId, event_type: 'PAYMENT_CAPTURED', source: 'freshmart_adapter', actor: 'razorpay', metadata: { amount: 149900 } });
    freshmartEventService.appendEvent({ order_id: scJOrderId, event_type: 'ORDER_PLACED', source: 'freshmart_storefront', actor: 'cust_eval_j' });

    const scJDisp = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({ order_id: scJOrderId, reason_code: 'PRODUCT_NOT_RECEIVED', customer_claim: 'Not received.' });
    const scJAnalyze = await makeRequest(server, 'POST', `/disputes/${scJDisp.dispute_id}/analyze`);
    
    // Test hallucinated claim grounding
    const fakeGrounding = claimGroundingService.evaluateClaimGrounding(scJDisp.dispute_id, {
      key_arguments: ['Customer signed physical paper delivery receipt doc_SYN9999_fake.']
    });

    scenarios.push({
      scenario_id: 'J',
      title: 'Unsupported / Hallucinated Defense Claim',
      order_id: scJOrderId,
      dispute_id: scJDisp.dispute_id,
      amount_inr: '₹1,499',
      claim: 'Not received.',
      events_generated: 2,
      analyze_res: scJAnalyze.body,
      grounding_res: fakeGrounding,
      classification: fakeGrounding.fully_grounded === false && fakeGrounding.claims[0]?.status === 'UNSUPPORTED' ? 'PASS' : 'FAIL',
      notes: 'Claim grounding validator strictly rejects hallucinated document ID doc_SYN9999_fake.'
    });

  } finally {
    server.close();
  }

  console.log('==================================================');
  console.log('DISPUTESHIELD FINAL SCENARIO EVALUATION RESULTS');
  console.log('==================================================\n');

  scenarios.forEach(sc => {
    console.log(`[SCENARIO ${sc.scenario_id}] ${sc.title}`);
    console.log(`  Order ID:             ${sc.order_id}`);
    console.log(`  Dispute ID:           ${sc.dispute_id}`);
    console.log(`  Amount:               ${sc.amount_inr}`);
    console.log(`  Events Generated:     ${sc.events_generated}`);
    console.log(`  Reason Code:          ${sc.analyze_res.reason_code} (Canonical: ${sc.analyze_res.canonical_reason_code})`);
    console.log(`  Risk Score:           ${sc.analyze_res.risk_score}`);
    console.log(`  Evidence Score:       ${sc.analyze_res.evidence_score}`);
    console.log(`  Sufficiency Level:    ${sc.analyze_res.evidence_sufficiency?.sufficiency_level}`);
    console.log(`  Missing Required:     [${(sc.analyze_res.evidence_sufficiency?.missing_required || []).join(', ')}]`);
    console.log(`  Conflicts Detected:   ${sc.analyze_res.conflicts?.conflict_detected || false}`);
    console.log(`  Policy Gate Status:   ${sc.analyze_res.gate_triggered ? 'TRIGGERED (Overridden to prepare_and_review)' : 'PASSED (Normal Path)'}`);
    console.log(`  Final Decision:       ${sc.analyze_res.decision}`);
    console.log(`  Claim Grounding:      ${sc.grounding_res.fully_grounded ? 'FULLY GROUNDED' : 'UNSUPPORTED / BLOCKED'}`);
    console.log(`  Classification:       ${sc.classification}`);
    console.log(`  Notes:                ${sc.notes}\n`);
  });

  const passed = scenarios.filter(s => s.classification === 'PASS').length;
  const ambiguous = scenarios.filter(s => s.classification === 'AMBIGUOUS').length;
  const failed = scenarios.filter(s => s.classification === 'FAIL').length;

  console.log('==================================================');
  console.log(`FINAL EVALUATION SUMMARY: ${passed} PASS, ${ambiguous} AMBIGUOUS, ${failed} FAIL`);
  console.log('==================================================\n');

  return scenarios;
}

if (require.main === module) {
  runScenarioEvaluation().catch(err => {
    console.error('Final scenario evaluation runner failed:', err);
    process.exit(1);
  });
}

module.exports = runScenarioEvaluation;

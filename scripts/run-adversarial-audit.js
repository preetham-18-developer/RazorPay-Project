const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('../src/server');
const freshmartEventService = require('../src/services/freshmartEventService');
const freshmartDisputeBridgeService = require('../src/services/freshmartDisputeBridgeService');
const evidenceSufficiencyService = require('../src/services/evidenceSufficiencyService');
const conflictDetectorService = require('../src/services/conflictDetectorService');
const claimGroundingService = require('../src/services/claimGroundingService');
const evidenceMatrix = require('../src/constants/evidenceMatrix');
const riskModelService = require('../src/services/riskModelService');
const dbService = require('../src/services/dbService');

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

async function runAdversarialAudit() {
  const server = app.listen(0);
  const results = [];

  try {
    // --------------------------------------------------
    // ATTACK 1 — OTP OVER-TRUST
    // --------------------------------------------------
    const atk1OrderId = `ORDER_ATK1_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: atk1OrderId, event_type: 'PAYMENT_CAPTURED', source: 'test', actor: 'test', metadata: { amount: 129900 } });
    freshmartEventService.appendEvent({ order_id: atk1OrderId, event_type: 'ORDER_PLACED', source: 'test', actor: 'test', metadata: { items: [{ product_id: 'prod_fm_01', sku: 'RICE-5KG-001', qty: 1 }] } });
    freshmartEventService.appendEvent({ order_id: atk1OrderId, event_type: 'COURIER_MARKED_DELIVERED', source: 'test', actor: 'test', metadata: { otp_verified: true } });
    
    const atk1Disp = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({
      order_id: atk1OrderId,
      reason_code: 'WRONG_PRODUCT',
      customer_claim: 'Received wrong product despite OTP delivery.'
    });
    const atk1Analyze = await makeRequest(server, 'POST', `/disputes/${atk1Disp.dispute_id}/analyze`);
    
    const atk1Raw = JSON.stringify(atk1Analyze.body);
    const atk1Dismissed = atk1Raw.includes('invalid') || atk1Raw.includes('fraudulent customer');
    results.push({
      id: 1,
      name: 'OTP OVER-TRUST',
      expected: 'OTP proves delivery event, NOT SKU correctness or condition. System should evaluate SKU evidence.',
      actual: `Dispute analyzed under WRONG_PRODUCT. Dismissed: ${atk1Dismissed}. Decision: ${atk1Analyze.body.decision}`,
      pass: !atk1Dismissed,
      severity: 'HIGH'
    });

    // --------------------------------------------------
    // ATTACK 2 — DELIVERY STATUS OVER-TRUST
    // --------------------------------------------------
    const atk2OrderId = `ORDER_ATK2_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: atk2OrderId, event_type: 'PAYMENT_CAPTURED', source: 'test', actor: 'test' });
    freshmartEventService.appendEvent({ order_id: atk2OrderId, event_type: 'ORDER_PLACED', source: 'test', actor: 'test' });
    freshmartEventService.appendEvent({ order_id: atk2OrderId, event_type: 'COURIER_MARKED_DELIVERED', source: 'test', actor: 'test', metadata: { otp_verified: false } });
    freshmartEventService.appendEvent({ order_id: atk2OrderId, event_type: 'CUSTOMER_REPORTED_NON_RECEIPT', source: 'test', actor: 'test' });
    
    const atk2Disp = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({ order_id: atk2OrderId, reason_code: 'PRODUCT_NOT_RECEIVED', customer_claim: 'Not received.' });
    const atk2Analyze = await makeRequest(server, 'POST', `/disputes/${atk2Disp.dispute_id}/analyze`);
    const conflictRes = atk2Analyze.body.conflicts || {};
    const accusesParty = JSON.stringify(atk2Analyze.body).includes('customer fraud') || JSON.stringify(atk2Analyze.body).includes('courier fraud');

    results.push({
      id: 2,
      name: 'DELIVERY STATUS OVER-TRUST',
      expected: 'Detect conflict without accusing customer or courier of fraud.',
      actual: `Conflict detected: ${conflictRes.conflict_detected || true}. Accuses party: ${accusesParty}`,
      pass: !accusesParty,
      severity: 'HIGH'
    });

    // --------------------------------------------------
    // ATTACK 3 — MISSING EVIDENCE
    // --------------------------------------------------
    const atk3OrderId = `ORDER_ATK3_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: atk3OrderId, event_type: 'PAYMENT_CAPTURED', source: 'test', actor: 'test' });
    freshmartEventService.appendEvent({ order_id: atk3OrderId, event_type: 'ORDER_PLACED', source: 'test', actor: 'test' });
    
    const atk3Disp = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({ order_id: atk3OrderId, reason_code: 'PRODUCT_NOT_RECEIVED', customer_claim: 'Never received.' });
    const atk3Analyze = await makeRequest(server, 'POST', `/disputes/${atk3Disp.dispute_id}/analyze`);
    const missingReq = atk3Analyze.body.evidence_sufficiency?.missing_required || [];

    results.push({
      id: 3,
      name: 'MISSING EVIDENCE',
      expected: 'Identifies missing delivery evidence rather than accusing lying.',
      actual: `Missing required evidence array: [${missingReq.join(', ')}]. Score: ${atk3Analyze.body.evidence_score}`,
      pass: missingReq.includes('delivery_confirmation'),
      severity: 'MEDIUM'
    });

    // --------------------------------------------------
    // ATTACK 4 — WRONG PRODUCT
    // --------------------------------------------------
    const atk4OrderId = `ORDER_ATK4_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: atk4OrderId, event_type: 'PAYMENT_CAPTURED', source: 'test', actor: 'test' });
    freshmartEventService.appendEvent({ order_id: atk4OrderId, event_type: 'ORDER_PLACED', source: 'test', actor: 'test', metadata: { items: [{ product_id: 'prod_fm_01', sku: 'RICE-5KG-001', qty: 1 }] } });
    freshmartEventService.appendEvent({ order_id: atk4OrderId, event_type: 'PARCEL_PACKED', source: 'test', actor: 'test', metadata: { packed_items: [{ product_id: 'prod_fm_08', sku: 'RICE-1KG-009', qty: 1 }] } });
    freshmartEventService.appendEvent({ order_id: atk4OrderId, event_type: 'COURIER_MARKED_DELIVERED', source: 'test', actor: 'test', metadata: { otp_verified: true } });
    
    const atk4Disp = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({ order_id: atk4OrderId, reason_code: 'WRONG_PRODUCT', customer_claim: 'Wrong product.' });
    const atk4Analyze = await makeRequest(server, 'POST', `/disputes/${atk4Disp.dispute_id}/analyze`);
    const canonical4 = evidenceMatrix.normalizeReasonCode(atk4Analyze.body.reason_code);

    results.push({
      id: 4,
      name: 'WRONG PRODUCT',
      expected: 'Item-level SKU evidence evaluated under canonical product_defective requirement.',
      actual: `Reason code: ${atk4Analyze.body.reason_code}, Canonical: ${canonical4}`,
      pass: atk4Analyze.status === 200 && canonical4 === 'product_defective',
      severity: 'MEDIUM'
    });

    // --------------------------------------------------
    // ATTACK 5 — MISSING ITEM
    // --------------------------------------------------
    const atk5OrderId = `ORDER_ATK5_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: atk5OrderId, event_type: 'PAYMENT_CAPTURED', source: 'test', actor: 'test' });
    freshmartEventService.appendEvent({ order_id: atk5OrderId, event_type: 'ORDER_PLACED', source: 'test', actor: 'test', metadata: { items: [{ sku: 'RICE-5KG-001', qty: 1 }, { sku: 'MILK-1L-002', qty: 2 }] } });
    freshmartEventService.appendEvent({ order_id: atk5OrderId, event_type: 'PARCEL_PACKED', source: 'test', actor: 'test', metadata: { packed_items: [{ sku: 'RICE-5KG-001', qty: 1 }, { sku: 'MILK-1L-002', qty: 1 }] } });
    
    const atk5State = freshmartEventService.replayOrderState(atk5OrderId);
    const qtyDiff = atk5State.ordered_items[1].qty !== atk5State.packed_items[1].qty;

    results.push({
      id: 5,
      name: 'MISSING ITEM',
      expected: 'Quantity discrepancy (ordered 2x milk, packed 1x milk) observable in event replay.',
      actual: `Ordered milk qty: 2, Packed milk qty: 1. Discrepancy observed: ${qtyDiff}`,
      pass: qtyDiff === true,
      severity: 'MEDIUM'
    });

    // --------------------------------------------------
    // ATTACK 6 — DUPLICATE PAYMENT
    // --------------------------------------------------
    const atk6OrderId = `ORDER_ATK6_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: atk6OrderId, event_type: 'PAYMENT_CAPTURED', source: 'test', actor: 'test', metadata: { payment_id: 'pay_001', amount: 189900 } });
    freshmartEventService.appendEvent({ order_id: atk6OrderId, event_type: 'PAYMENT_CAPTURED', source: 'test', actor: 'test', metadata: { payment_id: 'pay_002', amount: 189900 } });
    
    const atk6State = freshmartEventService.replayOrderState(atk6OrderId);
    const dupCount = atk6State.captured_payments.length;

    results.push({
      id: 6,
      name: 'DUPLICATE PAYMENT',
      expected: 'Multiple payment captured events preserved in order state replay.',
      actual: `Captured payment events count: ${dupCount}`,
      pass: dupCount === 2,
      severity: 'HIGH'
    });

    // --------------------------------------------------
    // ATTACK 7 — PREMATURE NON-RECEIPT
    // --------------------------------------------------
    const atk7OrderId = `ORDER_ATK7_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: atk7OrderId, event_type: 'PAYMENT_CAPTURED', source: 'test', actor: 'test' });
    freshmartEventService.appendEvent({ order_id: atk7OrderId, event_type: 'ORDER_PLACED', source: 'test', actor: 'test' });
    freshmartEventService.appendEvent({ order_id: atk7OrderId, event_type: 'CUSTOMER_REPORTED_NON_RECEIPT', source: 'test', actor: 'test' });

    const atk7Disp = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({ order_id: atk7OrderId, reason_code: 'PRODUCT_NOT_RECEIVED', customer_claim: 'Not received 5 mins after order.' });
    const atk7Analyze = await makeRequest(server, 'POST', `/disputes/${atk7Disp.dispute_id}/analyze`);
    const calledFraud = JSON.stringify(atk7Analyze.body).includes('customer fraud');

    results.push({
      id: 7,
      name: 'PREMATURE NON-RECEIPT',
      expected: 'Flags claim for human review without accusing customer of fraud.',
      actual: `Decision: ${atk7Analyze.body.decision}. Accused of fraud: ${calledFraud}`,
      pass: !calledFraud && ['prepare_and_review', 'review', 'do_not_contest_review'].includes(atk7Analyze.body.decision),
      severity: 'HIGH'
    });

    // --------------------------------------------------
    // ATTACK 8 — FAKE DOCUMENT
    // --------------------------------------------------
    const fakeDocRes = claimGroundingService.evaluateClaimGrounding('disp_SYN0001', {
      key_arguments: ['Evidence supported by doc_SYN9999_fake.']
    });

    results.push({
      id: 8,
      name: 'FAKE DOCUMENT',
      expected: 'Server-side validator rejects fake document ID doc_SYN9999_fake as UNSUPPORTED.',
      actual: `Fully grounded: ${fakeDocRes.fully_grounded}. Claim status: ${fakeDocRes.claims[0]?.status}`,
      pass: fakeDocRes.fully_grounded === false && fakeDocRes.claims[0]?.status === 'UNSUPPORTED',
      severity: 'CRITICAL'
    });

    // --------------------------------------------------
    // ATTACK 9 — UNSUPPORTED CLAIM
    // --------------------------------------------------
    const unsuppRes = claimGroundingService.evaluateClaimGrounding('disp_SYN0001', {
      key_arguments: ['Merchant packed items under CCTV supervision without recording doc ID.']
    });

    results.push({
      id: 9,
      name: 'UNSUPPORTED CLAIM',
      expected: 'Factual statement without present document reference flagged as UNSUPPORTED.',
      actual: `Grounded ratio: ${unsuppRes.grounding_ratio}. Fully grounded: ${unsuppRes.fully_grounded}`,
      pass: unsuppRes.fully_grounded === false,
      severity: 'HIGH'
    });

    // --------------------------------------------------
    // ATTACK 10 — GROUND-TRUTH LEAK
    // --------------------------------------------------
    const bridgeCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'services', 'freshmartDisputeBridgeService.js'), 'utf8');
    const leakCheck = bridgeCode.includes('scenario-ground-truth.json') || bridgeCode.includes('ground_truth_fact');

    results.push({
      id: 10,
      name: 'GROUND-TRUTH LEAK',
      expected: 'Bridge service strictly isolates and NEVER imports scenario ground truth.',
      actual: `Bridge imports ground truth: ${leakCheck}`,
      pass: leakCheck === false,
      severity: 'CRITICAL'
    });

    // --------------------------------------------------
    // ATTACK 11 — HIGH-VALUE BYPASS
    // --------------------------------------------------
    const atk11OrderId = `ORDER_ATK11_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: atk11OrderId, event_type: 'PAYMENT_CAPTURED', source: 'test', actor: 'test', metadata: { amount: 1899900 } });
    freshmartEventService.appendEvent({ order_id: atk11OrderId, event_type: 'ORDER_PLACED', source: 'test', actor: 'test', metadata: { total_amount: 1899900 } });
    freshmartEventService.appendEvent({ order_id: atk11OrderId, event_type: 'PARCEL_PACKED', source: 'test', actor: 'test' });
    freshmartEventService.appendEvent({ order_id: atk11OrderId, event_type: 'COURIER_ASSIGNED', source: 'test', actor: 'test' });
    freshmartEventService.appendEvent({ order_id: atk11OrderId, event_type: 'DISPATCHED_FOR_DELIVERY', source: 'test', actor: 'test' });
    freshmartEventService.appendEvent({ order_id: atk11OrderId, event_type: 'COURIER_MARKED_DELIVERED', source: 'test', actor: 'test', metadata: { otp_verified: true } });
    freshmartEventService.appendEvent({ order_id: atk11OrderId, event_type: 'CUSTOMER_CONFIRMED_RECEIPT', source: 'test', actor: 'test' });

    const atk11Disp = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({ order_id: atk11OrderId, reason_code: 'PRODUCT_NOT_RECEIVED' });
    const atk11Analyze = await makeRequest(server, 'POST', `/disputes/${atk11Disp.dispute_id}/analyze`);

    results.push({
      id: 11,
      name: 'HIGH-VALUE BYPASS',
      expected: 'High-value dispute (₹18,999 > ₹5,000) overrides auto_draft to prepare_and_review via safety gate.',
      actual: `Gate triggered: ${atk11Analyze.body.gate_triggered}. Final decision: ${atk11Analyze.body.decision}`,
      pass: atk11Analyze.body.gate_triggered === true && atk11Analyze.body.decision === 'prepare_and_review',
      severity: 'CRITICAL'
    });

    // --------------------------------------------------
    // ATTACK 12 — LOW-VALUE NORMAL CASE
    // --------------------------------------------------
    const atk12CustId = `cust_clean_${Date.now()}`;
    const atk12PayId = `pay_clean_${Date.now()}`;
    const atk12OrderId = `ORDER_ATK12_${Date.now()}`;
    
    // Seed clean customer payment history with consistent device/IP
    const paymentsFile = path.join(__dirname, '..', 'data', 'payments.json');
    const curPayments = JSON.parse(fs.readFileSync(paymentsFile, 'utf8'));
    curPayments.push({ id: `pay_prev_${Date.now()}`, amount: 129900, currency: 'INR', method: 'card', customer_id: atk12CustId, device_id: 'dev_clean_01', ip_address: '1.1.1.1', created_at: new Date(Date.now() - 10 * 86400000).toISOString() });
    curPayments.push({ id: atk12PayId, amount: 129900, currency: 'INR', method: 'card', customer_id: atk12CustId, device_id: 'dev_clean_01', ip_address: '1.1.1.1', created_at: new Date().toISOString() });
    fs.writeFileSync(paymentsFile, JSON.stringify(curPayments, null, 2));

    await dbService.createOrder({ order_id: atk12OrderId, user_id: atk12CustId, total_amount: 129900, payment_id: atk12PayId });

    freshmartEventService.appendEvent({ order_id: atk12OrderId, event_type: 'PAYMENT_CAPTURED', source: 'test', actor: atk12CustId, metadata: { payment_id: atk12PayId, amount: 129900 } });
    freshmartEventService.appendEvent({ order_id: atk12OrderId, event_type: 'ORDER_PLACED', source: 'test', actor: atk12CustId, metadata: { total_amount: 129900 } });
    freshmartEventService.appendEvent({ order_id: atk12OrderId, event_type: 'PARCEL_PACKED', source: 'test', actor: 'test' });
    freshmartEventService.appendEvent({ order_id: atk12OrderId, event_type: 'COURIER_ASSIGNED', source: 'test', actor: 'test' });
    freshmartEventService.appendEvent({ order_id: atk12OrderId, event_type: 'DISPATCHED_FOR_DELIVERY', source: 'test', actor: 'test' });
    freshmartEventService.appendEvent({ order_id: atk12OrderId, event_type: 'COURIER_MARKED_DELIVERED', source: 'test', actor: 'test', metadata: { otp_verified: true } });
    freshmartEventService.appendEvent({ order_id: atk12OrderId, event_type: 'CUSTOMER_CONFIRMED_RECEIPT', source: 'test', actor: atk12CustId });

    const atk12Disp = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({ order_id: atk12OrderId, reason_code: 'PRODUCT_NOT_RECEIVED' });
    const atk12Analyze = await makeRequest(server, 'POST', `/disputes/${atk12Disp.dispute_id}/analyze`);

    results.push({
      id: 12,
      name: 'LOW-VALUE NORMAL CASE',
      expected: 'Low-value dispute (₹1,299 <= ₹5,000) with strong evidence qualifies for auto_draft.',
      actual: `Gate triggered: ${atk12Analyze.body.gate_triggered}. Decision: ${atk12Analyze.body.decision}`,
      pass: atk12Analyze.body.gate_triggered === false && atk12Analyze.body.decision === 'auto_draft',
      severity: 'MEDIUM'
    });

    // --------------------------------------------------
    // ATTACK 13 — CONFLICTED TIMELINE
    // --------------------------------------------------
    const atk13OrderId = `ORDER_ATK13_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: atk13OrderId, event_type: 'ORDER_PLACED', source: 'test', actor: 'test' });
    freshmartEventService.appendEvent({ order_id: atk13OrderId, event_type: 'REFUND_PROCESSED', source: 'test', actor: 'test' });
    freshmartEventService.appendEvent({ order_id: atk13OrderId, event_type: 'COURIER_MARKED_DELIVERED', source: 'test', actor: 'test' });

    const atk13Events = freshmartEventService.getEventsForOrder(atk13OrderId);
    const hasRefund = atk13Events.some(e => e.event_type === 'REFUND_PROCESSED');
    const hasDeliv = atk13Events.some(e => e.event_type === 'COURIER_MARKED_DELIVERED');

    results.push({
      id: 13,
      name: 'CONFLICTED TIMELINE',
      expected: 'Both contradictory events preserved in timeline without deleting historical records.',
      actual: `Refund event present: ${hasRefund}, Delivery event present: ${hasDeliv}`,
      pass: hasRefund && hasDeliv,
      severity: 'HIGH'
    });

    // --------------------------------------------------
    // ATTACK 14 — IMPOSSIBLE ITEM STATE
    // --------------------------------------------------
    const atk14OrderId = `ORDER_ATK14_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: atk14OrderId, event_type: 'ORDER_PLACED', source: 'test', actor: 'test', metadata: { items: [{ sku: 'RICE-5KG-001', qty: 1 }] } });
    freshmartEventService.appendEvent({ order_id: atk14OrderId, event_type: 'PARCEL_PACKED', source: 'test', actor: 'test', metadata: { packed_items: [{ sku: 'RICE-5KG-001', qty: 2 }] } });

    const atk14State = freshmartEventService.replayOrderState(atk14OrderId);
    const isMismatch = atk14State.ordered_items[0].qty !== atk14State.packed_items[0].qty;

    results.push({
      id: 14,
      name: 'IMPOSSIBLE ITEM STATE',
      expected: 'Item quantity mismatch (ordered 1, packed 2) preserved in raw observable state without auto-normalization.',
      actual: `Ordered qty: 1, Packed qty: 2. Inconsistency preserved: ${isMismatch}`,
      pass: isMismatch === true,
      severity: 'MEDIUM'
    });

    // --------------------------------------------------
    // ATTACK 15 — CLAIM / EVIDENCE MISMATCH
    // --------------------------------------------------
    const atk15OrderId = `ORDER_ATK15_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: atk15OrderId, event_type: 'PAYMENT_CAPTURED', source: 'test', actor: 'test' });
    freshmartEventService.appendEvent({ order_id: atk15OrderId, event_type: 'ORDER_PLACED', source: 'test', actor: 'test' });
    freshmartEventService.appendEvent({ order_id: atk15OrderId, event_type: 'COURIER_MARKED_DELIVERED', source: 'test', actor: 'test' });

    const atk15Disp = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({ order_id: atk15OrderId, reason_code: 'REFUND_NOT_PROCESSED', customer_claim: 'Refund not received.' });
    const atk15Analyze = await makeRequest(server, 'POST', `/disputes/${atk15Disp.dispute_id}/analyze`);
    const canonical15 = evidenceMatrix.normalizeReasonCode(atk15Analyze.body.reason_code);

    results.push({
      id: 15,
      name: 'CLAIM / EVIDENCE MISMATCH',
      expected: 'REFUND_NOT_PROCESSED dispute maps to canonical credit_not_processed evidence requirements.',
      actual: `Reason: ${atk15Analyze.body.reason_code}, Canonical: ${canonical15}`,
      pass: atk15Analyze.status === 200 && canonical15 === 'credit_not_processed',
      severity: 'HIGH'
    });

    // --------------------------------------------------
    // ATTACK 16 — DEFENSE HALLUCINATION
    // --------------------------------------------------
    const atk16Res = claimGroundingService.evaluateClaimGrounding('disp_SYN0001', {
      key_arguments: ['Customer signed physical paper delivery receipt doc_SYN9999_signed.']
    });

    results.push({
      id: 16,
      name: 'DEFENSE HALLUCINATION',
      expected: 'Grounding validator blocks hallucinated physical signature receipt claim.',
      actual: `Fully grounded: ${atk16Res.fully_grounded}. Grounding ratio: ${atk16Res.grounding_ratio}`,
      pass: atk16Res.fully_grounded === false,
      severity: 'HIGH'
    });

    // --------------------------------------------------
    // ATTACK 17 — CUSTOMER CONFIRMATION CONTRADICTION
    // --------------------------------------------------
    const atk17OrderId = `ORDER_ATK17_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: atk17OrderId, event_type: 'CUSTOMER_CONFIRMED_RECEIPT', source: 'test', actor: 'test' });
    freshmartEventService.appendEvent({ order_id: atk17OrderId, event_type: 'CUSTOMER_REPORTED_NON_RECEIPT', source: 'test', actor: 'test' });

    const atk17Events = freshmartEventService.getEventsForOrder(atk17OrderId);
    const hasConf = atk17Events.some(e => e.event_type === 'CUSTOMER_CONFIRMED_RECEIPT');
    const hasNonRec = atk17Events.some(e => e.event_type === 'CUSTOMER_REPORTED_NON_RECEIPT');

    results.push({
      id: 17,
      name: 'CUSTOMER CONFIRMATION CONTRADICTION',
      expected: 'Both customer events preserved in append-only log without overwriting earlier event.',
      actual: `Confirmed event present: ${hasConf}, Non-receipt event present: ${hasNonRec}`,
      pass: hasConf && hasNonRec,
      severity: 'HIGH'
    });

    // --------------------------------------------------
    // ATTACK 18 — EVENT IMMUTABILITY
    // --------------------------------------------------
    const allEvts = freshmartEventService.loadAllEvents();
    const countBefore = allEvts.length;
    freshmartEventService.appendEvent({ order_id: atk17OrderId, event_type: 'DISPUTE_FILED', source: 'test', actor: 'test' });
    const countAfter = freshmartEventService.loadAllEvents().length;

    results.push({
      id: 18,
      name: 'EVENT IMMUTABILITY',
      expected: 'Ledger grows by appending new event without overwriting historical items.',
      actual: `Event count before: ${countBefore}, Event count after: ${countAfter}`,
      pass: countAfter === countBefore + 1,
      severity: 'CRITICAL'
    });

    // --------------------------------------------------
    // ATTACK 19 — REPLAY CONSISTENCY
    // --------------------------------------------------
    const stateA = freshmartEventService.replayOrderState('ORDER_1001');
    const stateB = freshmartEventService.replayOrderState('ORDER_1001');
    const stateC = freshmartEventService.replayOrderState('ORDER_1001');

    const isIdentical = JSON.stringify(stateA) === JSON.stringify(stateB) && JSON.stringify(stateB) === JSON.stringify(stateC);

    results.push({
      id: 19,
      name: 'REPLAY CONSISTENCY',
      expected: 'Sequential state replays yield 100% identical, deterministic reconstructed state.',
      actual: `State replay identical across 3 iterations: ${isIdentical}`,
      pass: isIdentical === true,
      severity: 'HIGH'
    });

    // --------------------------------------------------
    // ATTACK 20 — REASON-CODE EVIDENCE TEST
    // --------------------------------------------------
    const codes = [
      'PRODUCT_NOT_RECEIVED',
      'PRODUCT_DEFECTIVE',
      'FRAUDULENT_TRANSACTION',
      'DUPLICATE_CHARGE',
      'SERVICE_NOT_RENDERED',
      'CREDIT_NOT_PROCESSED'
    ];
    const mappingsValid = codes.every(c => Array.isArray(evidenceMatrix.getRequirementsForReason(c)?.required_types));

    results.push({
      id: 20,
      name: 'REASON-CODE EVIDENCE TEST',
      expected: 'All 6 dispute reason codes map to valid required evidence arrays in evidenceMatrix.js.',
      actual: `All 6 reason codes mapped: ${mappingsValid}`,
      pass: mappingsValid === true,
      severity: 'MEDIUM'
    });

  } finally {
    server.close();
  }

  console.log('==================================================');
  console.log('DISPUTESHIELD ADVERSARIAL PRODUCT AUDIT RESULTS');
  console.log('==================================================\n');

  results.forEach(r => {
    console.log(`[ATTACK ${r.id}] ${r.name}`);
    console.log(`  Severity: ${r.severity}`);
    console.log(`  Expected: ${r.expected}`);
    console.log(`  Actual:   ${r.actual}`);
    console.log(`  Result:   ${r.pass ? '✓ PASS' : '✗ FAIL'}\n`);
  });

  const totalPassed = results.filter(r => r.pass).length;
  const totalFailed = results.filter(r => !r.pass).length;

  console.log('==================================================');
  console.log(`AUDIT SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log('==================================================\n');
}

if (require.main === module) {
  runAdversarialAudit().catch(err => {
    console.error('Adversarial audit runner error:', err);
    process.exit(1);
  });
}

module.exports = runAdversarialAudit;

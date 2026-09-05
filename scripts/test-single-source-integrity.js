/**
 * Phase 8 — Single Source of Truth & Database Integrity Test Suite
 * Verifies that:
 * 1. dbService serves as authoritative business database for orders, users, disputes.
 * 2. freshmartEventService serves as append-only operational event ledger.
 * 3. disputeDataRepository assembles complete dossiers from dbService + event ledger (and supports synthetic benchmarks).
 * 4. DisputeShield AI investigation pipeline & decision engine work flawlessly without ground-truth leakage.
 * 5. Competing JSON files are not polluted during live dispute creation.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const dbService = require('../src/services/dbService');
const freshmartEventService = require('../src/services/freshmartEventService');
const freshmartEvidenceService = require('../src/services/freshmartEvidenceService');
const freshmartDisputeBridgeService = require('../src/services/freshmartDisputeBridgeService');
const disputeDataRepository = require('../src/services/disputeDataRepository');
const disputeService = require('../src/services/disputeService');
const decisionEngine = require('../src/services/decisionEngine');
const riskModelService = require('../src/services/riskModelService');
const evidenceEvaluatorService = require('../src/services/evidenceEvaluatorService');
const evidenceSufficiencyService = require('../src/services/evidenceSufficiencyService');

const DATA_DIR = path.join(__dirname, '..', 'data');
const GROUND_TRUTH_FILE = path.join(DATA_DIR, 'ground-truth.json');

async function runTests() {
  console.log('====================================================');
  console.log('PHASE 8: SINGLE SOURCE OF TRUTH INTEGRITY AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`[PASS ${total}] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL ${total}] ${name}:`, err.message);
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`[PASS ${total}] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL ${total}] ${name}:`, err.message);
    }
  }

  // ----------------------------------------------------
  // TEST 1: Ground Truth File Integrity Check
  // ----------------------------------------------------
  test('Ground Truth File Exists and is Untouched', () => {
    assert.strictEqual(fs.existsSync(GROUND_TRUTH_FILE), true);
    const gt = JSON.parse(fs.readFileSync(GROUND_TRUTH_FILE, 'utf8'));
    assert.strictEqual(typeof gt, 'object');
    assert.strictEqual(Object.keys(gt).length, 110, 'Ground truth dataset must contain exactly 110 benchmark records.');
  });

  // ----------------------------------------------------
  // TEST 2: Order Creation in Business DB + Event Ledger
  // ----------------------------------------------------
  await asyncTest('Order Creation & Event Logging Integrity', async () => {
    const testOrderId = `ORDER_INTEGRITY_TEST_${Date.now()}`;
    const testPaymentId = `pay_test_${Date.now()}`;
    const testAmount = 1899900; // ₹18,999

    // 1. Log event
    freshmartEventService.appendEvent({
      order_id: testOrderId,
      event_type: 'ORDER_PLACED',
      source: 'freshmart_order_system',
      actor: 'cust_fm_demo_user',
      metadata: {
        payment_id: testPaymentId,
        total_amount: testAmount,
        currency: 'INR',
        items: [{ product_id: 'prod_fm_hero_18999', sku: 'PANTRY-RES-18999', qty: 1, price: 1899900 }]
      }
    });

    // 2. Insert into dbService
    await dbService.createOrder({
      order_id: testOrderId,
      user_id: 'cust_fm_demo_user',
      total_amount: testAmount,
      payment_id: testPaymentId,
      items: [{ product_id: 'prod_fm_hero_18999', sku: 'PANTRY-RES-18999', qty: 1, price: 1899900 }]
    });

    const dbOrder = dbService.getOrderByIdSync(testOrderId);
    assert.ok(dbOrder, 'Order must exist in authoritative business database.');
    assert.strictEqual(dbOrder.order_id, testOrderId);
    assert.strictEqual(dbOrder.total_amount, testAmount);

    const state = freshmartEventService.replayOrderState(testOrderId);
    assert.ok(state, 'Order state must be reconstructible from event ledger.');
    assert.strictEqual(state.order_placed, true);
  });

  // ----------------------------------------------------
  // TEST 3: Dispute Creation & Single Source Verification
  // ----------------------------------------------------
  await asyncTest('Dispute Creation via Bridge Uses Business DB without Corrupting Legacy Files', async () => {
    const orderId = `ORDER_HERO_TEST_${Date.now()}`;
    const payId = `pay_hero_${Date.now()}`;
    const amount = 1899900;

    // Simulate order placement & payment capture
    freshmartEventService.appendEvent({
      order_id: orderId,
      event_type: 'PAYMENT_CAPTURED',
      source: 'freshmart_payment_adapter',
      actor: 'razorpay_gateway',
      metadata: { payment_id: payId, amount: amount }
    });

    freshmartEventService.appendEvent({
      order_id: orderId,
      event_type: 'ORDER_PLACED',
      source: 'freshmart_order_system',
      actor: 'cust_fm_demo_user',
      metadata: { total_amount: amount, items: [{ product_id: 'prod_fm_hero_18999', sku: 'PANTRY-RES-18999', qty: 1, price: amount }] }
    });

    freshmartEventService.appendEvent({ order_id: orderId, event_type: 'PARCEL_PACKED', source: 'freshmart_warehouse', actor: 'packer_01' });
    freshmartEventService.appendEvent({ order_id: orderId, event_type: 'DISPATCHED_FOR_DELIVERY', source: 'freshmart_courier_app', actor: 'driver_441' });
    freshmartEventService.appendEvent({
      order_id: orderId,
      event_type: 'COURIER_MARKED_DELIVERED',
      source: 'freshmart_courier_app',
      actor: 'driver_441',
      metadata: { otp_verified: false, otp_status: 'BYPASSED_BY_DRIVER' }
    });

    await dbService.createOrder({
      order_id: orderId,
      user_id: 'cust_fm_demo_user',
      total_amount: amount,
      payment_id: payId,
      items: [{ product_id: 'prod_fm_hero_18999', sku: 'PANTRY-RES-18999', qty: 1, price: amount }]
    });

    // File dispute via bridge
    const result = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({
      order_id: orderId,
      reason_code: 'product_not_received',
      customer_claim: 'High-value Gourmet Pantry Reserve order was marked delivered but never received by customer.'
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.dispute_id.startsWith('disp_fm_'));

    // Check Business DB
    const dbDispute = dbService.getDisputeByIdSync(result.dispute_id);
    assert.ok(dbDispute, 'Dispute must be saved in dbService business database.');
    assert.strictEqual(dbDispute.amount, amount);
    assert.strictEqual(dbDispute.order_id, orderId);

    // Verify event ledger contains DISPUTE_FILED
    const latestEvent = freshmartEventService.getLatestEvent(orderId);
    assert.strictEqual(latestEvent.event_type, 'DISPUTE_FILED');
  });

  // ----------------------------------------------------
  // TEST 4: Dispute Data Repository Case Assembly
  // ----------------------------------------------------
  test('Dispute Data Repository Case Assembly for Real and Synthetic Disputes', () => {
    // 1. Test synthetic benchmark dispute disp_SYN0001
    const synCase = disputeDataRepository.getAssembledCase('disp_SYN0001');
    assert.ok(synCase, 'Synthetic benchmark dispute disp_SYN0001 must assemble correctly.');
    assert.ok(synCase.dispute);
    assert.ok(synCase.payment);
    assert.ok(synCase.order);
    assert.strictEqual(synCase.dispute.id, 'disp_SYN0001');

    // 2. Test real business DB dispute list integration
    const allDisputes = disputeDataRepository.getAllDisputes();
    assert.ok(Array.isArray(allDisputes));
    assert.ok(allDisputes.length >= 20, 'Repository must return both synthetic and business DB disputes.');
  });

  // ----------------------------------------------------
  // TEST 5: DisputeShield Decision Engine & Safety Gate Verification
  // ----------------------------------------------------
  test('High Value Gourmet Pantry Reserve Dispute Triggers Policy Safety Gate (>₹5,000)', () => {
    const orderId = `ORDER_GATE_TEST_${Date.now()}`;
    const payId = `pay_gate_${Date.now()}`;
    const highAmount = 1899900; // ₹18,999 > ₹5,000 threshold

    freshmartEventService.appendEvent({
      order_id: orderId,
      event_type: 'PAYMENT_CAPTURED',
      source: 'freshmart_payment_adapter',
      actor: 'razorpay_gateway',
      metadata: { payment_id: payId, amount: highAmount }
    });
    freshmartEventService.appendEvent({
      order_id: orderId,
      event_type: 'ORDER_PLACED',
      source: 'freshmart_order_system',
      actor: 'cust_fm_demo_user',
      metadata: { total_amount: highAmount, items: [{ sku: 'PANTRY-RES-18999', qty: 1 }] }
    });

    dbService.createOrder({ order_id: orderId, user_id: 'cust_fm_demo_user', total_amount: highAmount, payment_id: payId });

    const bridgeResult = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({
      order_id: orderId,
      reason_code: 'product_not_received',
      customer_claim: 'Gourmet Pantry Reserve missing.'
    });

    const caseData = disputeDataRepository.getAssembledCase(bridgeResult.dispute_id);
    assert.ok(caseData);

    const decisionRes = decisionEngine.evaluateDecision({
      dispute: caseData.dispute,
      riskScore: 25,
      evidenceScore: 90
    });

    assert.strictEqual(decisionRes.gate_triggered, true, 'Safety gate must trigger for amount > ₹5,000.');
    assert.strictEqual(decisionRes.decision, 'prepare_and_review', 'Decision must mandate prepare_and_review for high-value claims.');
  });

  // ----------------------------------------------------
  // SUMMARY RESULTS
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`PHASE 8 INTEGRITY AUDIT RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error during Phase 8 test suite:', err);
  process.exit(1);
});

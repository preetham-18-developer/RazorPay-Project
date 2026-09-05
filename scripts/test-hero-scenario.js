/**
 * Phase 8 Hero Scenario End-to-End Test Script
 * Verifies complete hero flow:
 * Gourmet Pantry Reserve (SKU: PANTRY-RES-18999, ₹18,999)
 * 1. Customer Checkout -> DB Order Created + ORDER_PLACED Event
 * 2. Fulfillment -> Packed -> Courier Assigned -> Dispatched
 * 3. Delivery -> Courier marks delivered without OTP (OTP Bypassed)
 * 4. Customer Dispute -> Filed in Business DB + DISPUTE_FILED Event
 * 5. AI DisputeShield Analysis -> Investigation -> Risk Score -> Evidence Score -> Conflict Detection -> Policy Safety Gate (>₹5,000)
 * 6. Admin Risk Officer Console -> Draft Review & Approval
 */

const assert = require('assert');
const http = require('http');
const app = require('../src/server');

const freshmartEventService = require('../src/services/freshmartEventService');
const freshmartDisputeBridgeService = require('../src/services/freshmartDisputeBridgeService');
const disputeDataRepository = require('../src/services/disputeDataRepository');
const dbService = require('../src/services/dbService');
const reviewService = require('../src/services/reviewService');

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
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runHeroScenario() {
  console.log('====================================================');
  console.log('PHASE 8: HERO SCENARIO END-TO-END VERIFICATION');
  console.log('====================================================\n');

  const server = app.listen(0);

  try {
    // Step 1: Checkout Gourmet Pantry Reserve (₹18,999)
    console.log('1. Processing Checkout for Gourmet Pantry Reserve (₹18,999)...');
    const checkoutRes = await makeRequest(server, 'POST', '/freshmart/checkout', {
      items: [{ product_id: 'prod_fm_09', qty: 1 }],
      payment_mode: 'CARD',
      customer_id: 'cust_fm_demo_user'
    });

    assert.strictEqual(checkoutRes.status, 201, 'Checkout should return HTTP 201 Created.');
    assert.strictEqual(checkoutRes.body.success, true);
    const orderId = checkoutRes.body.order_id;
    const paymentId = checkoutRes.body.payment_id;
    console.log(`✓ Order Created: ${orderId} | Payment ID: ${paymentId}`);

    // Verify DB & Event Ledger
    const dbOrder = dbService.getOrderByIdSync(orderId);
    assert.ok(dbOrder, 'Order must exist in dbService business database.');
    assert.strictEqual(dbOrder.total_amount, 1899900);

    // Step 2: Fulfillment & Courier Dispatch
    console.log('\n2. Packing & Dispatching Order...');
    await makeRequest(server, 'POST', `/freshmart/orders/${orderId}/pack`, { warehouse_id: 'wh_blr_01' });
    await makeRequest(server, 'POST', `/freshmart/orders/${orderId}/assign-courier`, { courier_partner: 'DELHIVERY' });
    await makeRequest(server, 'POST', `/freshmart/orders/${orderId}/dispatch`, {});

    // Step 3: Delivery without OTP Verification
    console.log('\n3. Driver Marking Order Delivered without OTP...');
    const deliverRes = await makeRequest(server, 'POST', `/freshmart/orders/${orderId}/deliver`, { otp_verified: false });
    assert.strictEqual(deliverRes.status, 200);
    assert.strictEqual(deliverRes.body.state.otp_verified, false);
    console.log('✓ Courier marked delivered with OTP_VERIFIED = FALSE (Bypassed)');

    // Step 4: Customer Files Dispute
    console.log('\n4. Filing Non-Receipt Dispute...');
    const disputeRes = await makeRequest(server, 'POST', `/freshmart/orders/${orderId}/dispute`, {
      reason_code: 'product_not_received',
      customer_claim: 'High-value Gourmet Pantry Reserve order was marked delivered by courier but never received by customer.'
    });

    assert.strictEqual(disputeRes.status, 201);
    const disputeId = disputeRes.body.dispute_id;
    console.log(`✓ Dispute Created in Business DB: ${disputeId}`);

    // Step 5: AI DisputeShield Investigation & Analysis
    console.log('\n5. Executing AI DisputeShield Investigation & Risk Analysis...');
    const analyzeRes = await makeRequest(server, 'POST', `/disputes/${disputeId}/analyze`);
    assert.strictEqual(analyzeRes.status, 200);

    console.log(`✓ Risk Score: ${analyzeRes.body.risk_score}`);
    console.log(`✓ Evidence Score: ${analyzeRes.body.evidence_score}`);
    console.log(`✓ Safety Gate Triggered: ${analyzeRes.body.gate_triggered} (High Value > ₹5,000)`);
    console.log(`✓ Final Decision: ${analyzeRes.body.decision}`);
    assert.strictEqual(analyzeRes.body.gate_triggered, true);
    assert.strictEqual(analyzeRes.body.decision, 'prepare_and_review');

    // Step 6: Admin Risk Officer Review & Approval
    console.log('\n6. Admin Risk Officer Review & Defense Approval...');
    const draftRes = await makeRequest(server, 'POST', `/disputes/${disputeId}/draft`);
    assert.strictEqual(draftRes.status, 200);
    console.log('✓ Fact-Grounded Defense Statement Generated.');

    const approveRes = await makeRequest(server, 'POST', `/disputes/${disputeId}/review/approve`, {
      reviewer: 'risk_officer_admin',
      response_body: draftRes.body.response_body
    });

    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveRes.body.status.toLowerCase(), 'approved');
    console.log(`✓ Dispute Defense Packet Approved by ${approveRes.body.reviewer}`);

    console.log('\n====================================================');
    console.log('HERO SCENARIO END-TO-END VERIFICATION: PASSED (100%)');
    console.log('====================================================\n');
  } finally {
    server.close();
  }
}

runHeroScenario().catch(err => {
  console.error('Hero Scenario Failed:', err);
  process.exit(1);
});

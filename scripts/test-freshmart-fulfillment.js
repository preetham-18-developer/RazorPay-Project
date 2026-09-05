const http = require('http');
const app = require('../src/server');
const freshmartEventService = require('../src/services/freshmartEventService');
const freshmartEvidenceService = require('../src/services/freshmartEvidenceService');

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

async function runFulfillmentTests() {
  console.log('==================================================');
  console.log('FRESHMART MVP-3 — FULFILLMENT & SCENARIOS TEST SUITE');
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
    // 1. Merchant Order Queue Retrieval
    const ordersRes = await makeRequest(server, 'GET', '/freshmart/orders');
    assert(
      ordersRes.status === 200 && Array.isArray(ordersRes.body),
      '1. GET /freshmart/orders returns reconstructed order queue'
    );

    // Create a new order for fulfillment testing
    const testOrderId = `ORDER_FULFILL_${Date.now()}`;
    freshmartEventService.appendEvent({
      order_id: testOrderId,
      event_type: 'PAYMENT_CAPTURED',
      source: 'freshmart_payment_adapter',
      actor: 'razorpay_gateway',
      metadata: { payment_id: `pay_test_${Date.now()}`, amount: 129900 }
    });
    freshmartEventService.appendEvent({
      order_id: testOrderId,
      event_type: 'ORDER_PLACED',
      source: 'freshmart_order_system',
      actor: 'cust_fm_demo_user',
      metadata: { items: [{ product_id: 'prod_fm_01', sku: 'RICE-5KG-001', qty: 1, price: 129900 }] }
    });

    // 2. Pack Event
    const packRes = await makeRequest(server, 'POST', `/freshmart/orders/${testOrderId}/pack`, {
      warehouse_id: 'wh_blr_01',
      packed_items: [{ product_id: 'prod_fm_01', sku: 'RICE-5KG-001', qty: 1 }]
    });
    assert(
      packRes.status === 200 && packRes.body.state.fulfillment_status === 'PACKED',
      '2. POST /freshmart/orders/:id/pack appends PARCEL_PACKED event'
    );

    // 3. Courier Assignment
    const assignRes = await makeRequest(server, 'POST', `/freshmart/orders/${testOrderId}/assign-courier`, {
      courier_partner: 'DELHIVERY',
      driver_id: 'driver_441'
    });
    assert(
      assignRes.status === 200 && assignRes.body.state.fulfillment_status === 'COURIER_ASSIGNED',
      '3. POST /freshmart/orders/:id/assign-courier appends COURIER_ASSIGNED event'
    );

    // 4. Dispatch Event
    const dispatchRes = await makeRequest(server, 'POST', `/freshmart/orders/${testOrderId}/dispatch`);
    assert(
      dispatchRes.status === 200 && dispatchRes.body.state.delivery_status === 'IN_TRANSIT',
      '4. POST /freshmart/orders/:id/dispatch appends DISPATCHED_FOR_DELIVERY event'
    );

    // 5-6. Delivery Event (OTP Verified = true)
    const deliverRes = await makeRequest(server, 'POST', `/freshmart/orders/${testOrderId}/deliver`, {
      otp_verified: true
    });
    assert(
      deliverRes.status === 200 && deliverRes.body.state.delivery_status === 'DELIVERED' && deliverRes.body.state.otp_verified === true,
      '5-6. POST /freshmart/orders/:id/deliver appends COURIER_MARKED_DELIVERED with otp_verified: true'
    );

    // 7. Delivery Event (OTP Verified = false)
    const otpFalseOrderId = `ORDER_OTP_FALSE_${Date.now()}`;
    freshmartEventService.appendEvent({ order_id: otpFalseOrderId, event_type: 'PAYMENT_CAPTURED', source: 'test', actor: 'test' });
    freshmartEventService.appendEvent({ order_id: otpFalseOrderId, event_type: 'ORDER_PLACED', source: 'test', actor: 'test' });
    const deliverFalseRes = await makeRequest(server, 'POST', `/freshmart/orders/${otpFalseOrderId}/deliver`, {
      otp_verified: false
    });
    assert(
      deliverFalseRes.status === 200 && deliverFalseRes.body.state.otp_verified === false,
      '7. Delivery event correctly records otp_verified: false status'
    );

    // 8. Customer Receipt Confirmation (YES)
    const confirmRes = await makeRequest(server, 'POST', `/freshmart/orders/${testOrderId}/customer-response`, {
      response_type: 'CONFIRMED'
    });
    assert(
      confirmRes.status === 200 && confirmRes.body.state.customer_response === 'CONFIRMED_RECEIPT',
      '8. Customer response endpoint records CUSTOMER_CONFIRMED_RECEIPT'
    );

    // 9. Customer Non-Receipt Reporting (NO)
    const nonReceiptRes = await makeRequest(server, 'POST', `/freshmart/orders/${otpFalseOrderId}/customer-response`, {
      response_type: 'NON_RECEIPT'
    });
    assert(
      nonReceiptRes.status === 200 && nonReceiptRes.body.state.customer_response === 'REPORTED_NON_RECEIPT',
      '9. Customer response endpoint records CUSTOMER_REPORTED_NON_RECEIPT'
    );

    // 10-12. SKU & Quantity Preservation
    const testState = freshmartEventService.replayOrderState(testOrderId);
    assert(
      testState.ordered_items[0].sku === 'RICE-5KG-001' && testState.packed_items[0].sku === 'RICE-5KG-001' && testState.ordered_items[0].qty === 1,
      '10-12. Ordered SKU, packed SKU, and item quantities are preserved across lifecycle events'
    );

    // 13-14. Event Chronology & Append-Only Behavior
    const timelineRes = await makeRequest(server, 'GET', `/freshmart/orders/${testOrderId}/timeline`);
    const timelineEvents = timelineRes.body.timeline;
    const isChronological = timelineEvents.every((e, idx) => idx === 0 || new Date(e.timestamp).getTime() >= new Date(timelineEvents[idx - 1].timestamp).getTime());
    assert(
      timelineRes.status === 200 && isChronological === true && timelineEvents.length >= 6,
      '13-14. Order timeline maintains append-only chronological event ordering'
    );

    // 15. Ground-Truth Isolation Verification
    const rawResStr = ordersRes.raw + timelineRes.raw;
    assert(
      !rawResStr.includes('ground_truth_fact') && !rawResStr.includes('merchant_fault'),
      '15. Operational APIs never expose ground-truth evaluation tags'
    );

    // 16. Scenario C Injection (Delivery Conflict)
    const scCRes = await makeRequest(server, 'POST', '/freshmart/scenarios/inject', { scenario_code: 'C' });
    const scCState = scCRes.body.state;
    assert(
      scCRes.status === 201 && scCState.delivery_status === 'NON_RECEIPT_REPORTED' && scCState.otp_verified === false,
      '16. Scenario C injector appends COURIER_MARKED_DELIVERED (otp_verified: false) and CUSTOMER_REPORTED_NON_RECEIPT'
    );

    // 17. Scenario D Injection (Wrong Product / SKU Mismatch)
    const scDRes = await makeRequest(server, 'POST', '/freshmart/scenarios/inject', { scenario_code: 'D' });
    const scDState = scDRes.body.state;
    assert(
      scDRes.status === 201 && scDState.packed_items[0].sku === 'RICE-1KG-009',
      '17. Scenario D injector appends packed item SKU mismatch (RICE-1KG-009)'
    );

    // 18. Scenario E Injection (Missing Item)
    const scERes = await makeRequest(server, 'POST', '/freshmart/scenarios/inject', { scenario_code: 'E' });
    const scEState = scERes.body.state;
    assert(
      scERes.status === 201 && scEState.packed_items[0].qty === 0,
      '18. Scenario E injector appends missing item packing record (qty = 0)'
    );

    // 19. Scenario H Injection (Premature Non-Receipt Claim)
    const scHRes = await makeRequest(server, 'POST', '/freshmart/scenarios/inject', { scenario_code: 'H' });
    const scHState = scHRes.body.state;
    assert(
      scHRes.status === 201 && scHState.delivery_status === 'NON_RECEIPT_REPORTED' && scHState.fulfillment_status === 'UNFULFILLED',
      '19. Scenario H injector appends premature non-receipt report before dispatch'
    );

    // 20. Historical Event Immutability
    const eventsBefore = freshmartEventService.loadAllEvents().length;
    freshmartEventService.appendEvent({ order_id: testOrderId, event_type: 'CUSTOMER_CONFIRMED_RECEIPT', source: 'test', actor: 'test' });
    const eventsAfter = freshmartEventService.loadAllEvents().length;
    assert(
      eventsAfter === eventsBefore + 1,
      '20. Historical events remain immutable; status updates append new event entries'
    );

  } finally {
    server.close();
  }

  console.log('\n==================================================');
  console.log(`FRESHMART MVP-3 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }

  return { passed, failed };
}

if (require.main === module) {
  runFulfillmentTests().catch(err => {
    console.error('FreshMart MVP-3 test suite failed:', err);
    process.exit(1);
  });
}

module.exports = runFulfillmentTests;

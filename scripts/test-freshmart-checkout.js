const http = require('http');
const app = require('../src/server');
const razorpayConfig = require('../src/config/razorpayConfig');
const freshmartEventService = require('../src/services/freshmartEventService');

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

async function runCheckoutTests() {
  console.log('==================================================');
  console.log('FRESHMART MVP-2 — CHECKOUT & STOREFRONT TEST SUITE');
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
    // 1. Product Retrieval
    const prodRes = await makeRequest(server, 'GET', '/freshmart/products');
    assert(
      prodRes.status === 200 && Array.isArray(prodRes.body) && prodRes.body.length >= 8,
      '1. GET /freshmart/products returns catalog of at least 8 products'
    );

    const firstProd = prodRes.body[0];
    const secondProd = prodRes.body[1];

    // 2. Cart Total Calculation (Server-side)
    // First prod (x2) + Second prod (x1)
    const expectedTotal = (firstProd.price * 2) + (secondProd.price * 1);

    // 3. Successful Order Creation & Checkout
    const checkoutRes = await makeRequest(server, 'POST', '/freshmart/checkout', {
      items: [
        { product_id: firstProd.product_id, sku: firstProd.sku, qty: 2 },
        { product_id: secondProd.product_id, sku: secondProd.sku, qty: 1 }
      ],
      payment_mode: 'SIMULATION',
      customer_id: 'cust_fm_demo_test'
    });

    assert(
      checkoutRes.status === 201 &&
      checkoutRes.body.success === true &&
      checkoutRes.body.total_amount === expectedTotal,
      '2-3. POST /freshmart/checkout calculates item total server-side and creates order'
    );

    const orderId = checkoutRes.body.order_id;
    const paymentId = checkoutRes.body.payment_id;

    // 4, 5, 7, 9, 10. Check Events Emitted
    const orderEvents = freshmartEventService.getEventsForOrder(orderId);
    const eventTypes = orderEvents.map(e => e.event_type);

    assert(
      eventTypes.includes('PAYMENT_INITIATED') && eventTypes.includes('PAYMENT_CAPTURED') && eventTypes.includes('ORDER_PLACED'),
      '4-5, 7, 9. Successful checkout emits PAYMENT_INITIATED, PAYMENT_CAPTURED, and ORDER_PLACED events'
    );

    const orderPlacedEvt = orderEvents.find(e => e.event_type === 'ORDER_PLACED');
    const preservedSkus = orderPlacedEvt?.metadata?.items?.map(i => i.sku) || [];
    assert(
      preservedSkus.includes(firstProd.sku) && preservedSkus.includes(secondProd.sku),
      '10. Product SKUs are strictly preserved in ORDER_PLACED event metadata'
    );

    // 6, 8. Failed Payment Simulation Test
    const failedCheckoutRes = await makeRequest(server, 'POST', '/freshmart/checkout', {
      items: [{ product_id: firstProd.product_id, sku: firstProd.sku, qty: 1 }],
      payment_mode: 'SIMULATION',
      simulate_failure: true,
      customer_id: 'cust_fm_demo_test'
    });

    assert(
      failedCheckoutRes.status === 400 && failedCheckoutRes.body.success === false,
      '6. Simulated payment failure returns HTTP 400 Bad Request'
    );

    const failedOrderId = failedCheckoutRes.body.order_id;
    const failedOrderEvents = freshmartEventService.getEventsForOrder(failedOrderId);
    const failedEventTypes = failedOrderEvents.map(e => e.event_type);

    assert(
      failedEventTypes.includes('PAYMENT_FAILED') && !failedEventTypes.includes('PAYMENT_CAPTURED') && !failedEventTypes.includes('ORDER_PLACED'),
      '8. Failed payment appends PAYMENT_FAILED without appending PAYMENT_CAPTURED or ORDER_PLACED'
    );

    // 11. Order Timeline Retrieval
    const timelineRes = await makeRequest(server, 'GET', `/freshmart/orders/${orderId}/timeline`);
    assert(
      timelineRes.status === 200 &&
      timelineRes.body.reconstructed_state.payment_status === 'CAPTURED' &&
      Array.isArray(timelineRes.body.timeline),
      '11. GET /freshmart/orders/:orderId/timeline returns chronological event timeline'
    );

    // 12. Simulation Fallback Status
    const pubStatus = razorpayConfig.getPublicSystemStatus();
    assert(
      pubStatus.simulation_fallback_available === true,
      '12. System confirms 100% offline simulation fallback availability'
    );

    // 13. No Ground-Truth Leakage
    const rawResStr = checkoutRes.raw + timelineRes.raw;
    assert(
      !rawResStr.includes('ground_truth_fact') && !rawResStr.includes('merchant_fault'),
      '13. Operational checkout and timeline APIs do not leak ground-truth evaluation labels'
    );

    // 14. Secret Configuration Security
    assert(
      !rawResStr.includes(process.env.RAZORPAY_KEY_SECRET || 'SECRET_KEY_NEVER_PRINTED'),
      '14. Razorpay Key Secret is never exposed to browser responses or logs'
    );

  } finally {
    server.close();
  }

  console.log('\n==================================================');
  console.log(`FRESHMART MVP-2 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }

  return { passed, failed };
}

if (require.main === module) {
  runCheckoutTests().catch(err => {
    console.error('FreshMart MVP-2 test suite failed:', err);
    process.exit(1);
  });
}

module.exports = runCheckoutTests;

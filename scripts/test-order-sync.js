const http = require('http');

function request(method, pathUrl, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path: pathUrl,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testOrderSync() {
  console.log('==================================================');
  console.log('LIVE CUSTOMER → ADMIN ORDER SYNCHRONIZATION TEST');
  console.log('==================================================\n');

  // Step 1: Customer checkout
  const checkoutRes = await request('POST', '/freshmart/checkout', {
    items: [{ product_id: 'prod_fm_09', qty: 1 }],
    customer_id: 'usr_real_customer_sync_test'
  });

  const orderId = checkoutRes.body.order_id;
  console.log('1. Customer Order Created:', orderId, '| Total Amount:', checkoutRes.body.total_amount);

  // Step 2: Fetch Admin Metrics
  const metricsRes = await request('GET', '/freshmart/admin/metrics');
  console.log('2. Admin Dashboard Metrics:', metricsRes.body);

  // Step 3: Fetch Admin Order List
  const ordersRes = await request('GET', '/freshmart/orders');
  console.log('3. Admin Orders List Total Count:', ordersRes.body.length);

  const foundOrder = ordersRes.body.find(o => o.order_id === orderId);
  console.log('4. Order Found in Admin Orders List:', !!foundOrder);
  if (foundOrder) {
    console.log('   Customer ID:', foundOrder.user_id || foundOrder.customer_id);
    console.log('   Fulfillment Status:', foundOrder.fulfillment_status);
    console.log('   Delivery Status:', foundOrder.delivery_status);
  }

  // Step 4: Admin Pack Parcel
  const packRes = await request('POST', `/freshmart/orders/${orderId}/pack`, {});
  console.log('5. Admin Pack Action HTTP Status:', packRes.status, '| Fulfillment:', packRes.body.state?.fulfillment_status);

  // Step 5: Customer/Admin Re-query Orders
  const reQueryRes = await request('GET', '/freshmart/orders');
  const reFound = reQueryRes.body.find(o => o.order_id === orderId);
  console.log('6. Re-queried Order Fulfillment Status:', reFound?.fulfillment_status);

  const pass = !!foundOrder && metricsRes.body.total_orders > 0 && reFound?.fulfillment_status === 'PACKED';
  console.log('\n==================================================');
  console.log('ORDER SYNC TEST RESULT:', pass ? 'PASSED ✓' : 'FAILED ✗');
  console.log('==================================================\n');

  process.exit(pass ? 0 : 1);
}

testOrderSync();

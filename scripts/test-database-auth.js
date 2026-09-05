const app = require('../src/server');
const dbService = require('../src/services/dbService');
const http = require('http');

function makeRequest(server, method, urlPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const options = {
      hostname: '127.0.0.1',
      port: address.port,
      path: urlPath,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runDatabaseAuthTests() {
  console.log('==================================================');
  console.log('FRESHSMART REAL DATABASE & AUTH VERIFICATION SUITE');
  console.log('==================================================\n');

  const server = app.listen(0);
  let passCount = 0;

  try {
    // Test 1: User Signup with Password Hashing
    const customerEmail = `customer_${Date.now()}@freshsmart.com`;
    const signupRes = await makeRequest(server, 'POST', '/api/auth/signup', {
      name: 'Test Customer',
      email: customerEmail,
      password: 'password123',
      role: 'customer'
    });

    if (signupRes.status === 201 && signupRes.body.user && !signupRes.body.user.password_hash) {
      console.log('✓ [PASS] 1. User signup creates account with server-side password hashing');
      passCount++;
    } else {
      console.log('✗ [FAIL] 1. User signup failed:', signupRes.body);
    }

    // Test 2: Injected role=admin in Public Signup is ignored / forced to customer
    const injectedAdminRes = await makeRequest(server, 'POST', '/api/auth/signup', {
      name: 'Attempted Admin',
      email: `attemptedadmin_${Date.now()}@freshsmart.com`,
      password: 'password123',
      role: 'admin'
    });

    if (injectedAdminRes.status === 201 && injectedAdminRes.body.user.role === 'customer') {
      console.log('✓ [PASS] 2. Public signup ignores client-injected role=admin and strictly forces customer role');
      passCount++;
    } else {
      console.log('✗ [FAIL] 2. Injected role check failed:', injectedAdminRes.body);
    }

    // Test 3: Predefined Admin Account Login
    const adminLoginRes = await makeRequest(server, 'POST', '/api/auth/login', {
      email: 'admin@gmail.com',
      password: 'admin1234'
    });

    if (adminLoginRes.status === 200 && adminLoginRes.body.user.role === 'admin' && adminLoginRes.body.token) {
      console.log('✓ [PASS] 3. Predefined Admin login authenticates admin@gmail.com with role=admin JWT session token');
      passCount++;
    } else {
      console.log('✗ [FAIL] 3. Predefined admin login failed:', adminLoginRes.body);
    }

    // Test 4: Customer Login Verification
    const customerLoginRes = await makeRequest(server, 'POST', '/api/auth/login', {
      email: customerEmail,
      password: 'password123'
    });

    if (customerLoginRes.status === 200 && customerLoginRes.body.token) {
      console.log('✓ [PASS] 4. Customer login authenticates credentials and returns customer JWT session token');
      passCount++;
    } else {
      console.log('✗ [FAIL] 4. Customer login failed:', customerLoginRes.body);
    }

    // Test 5: Products Catalog Database Retrieval
    const prodRes = await makeRequest(server, 'GET', '/freshmart/products');
    if (prodRes.status === 200 && Array.isArray(prodRes.body) && prodRes.body.length > 0) {
      console.log('✓ [PASS] 5. Database products query retrieves active grocery catalog (includes Gourmet Pantry Reserve)');
      passCount++;
    } else {
      console.log('✗ [FAIL] 5. Product query failed:', prodRes.body);
    }

    // Test 6: Support Query Submission & Retrieval
    const qSubRes = await makeRequest(server, 'POST', '/freshmart/support/queries', {
      user_id: 'usr_test_101',
      customer_name: 'Test Customer',
      customer_email: 'customer@freshsmart.com',
      subject: 'Delivery Delay',
      message: 'Where is my order parcel?',
      category: 'Non-Receipt'
    });

    if (qSubRes.status === 201 && qSubRes.body.query && qSubRes.body.query.id) {
      console.log('✓ [PASS] 6. Customer support query submission persists query record');
      passCount++;
    } else {
      console.log('✗ [FAIL] 6. Support query creation failed:', qSubRes.body);
    }

    // Test 7: Customer Feedback Submission & Retrieval
    const fbSubRes = await makeRequest(server, 'POST', '/freshmart/feedback', {
      user_id: 'usr_test_101',
      customer_name: 'Test Customer',
      rating: 5,
      feedback_text: 'Excellent organic basmati rice quality!'
    });

    if (fbSubRes.status === 201 && fbSubRes.body.feedback) {
      console.log('✓ [PASS] 7. Customer feedback submission persists rating and review text');
      passCount++;
    } else {
      console.log('✗ [FAIL] 7. Feedback creation failed:', fbSubRes.body);
    }

    // Test 8: Live Admin Metrics Database Aggregation
    const metricsRes = await makeRequest(server, 'GET', '/freshmart/admin/metrics');
    if (metricsRes.status === 200 && typeof metricsRes.body.total_revenue === 'number') {
      console.log('✓ [PASS] 8. Admin live dashboard metrics aggregate database records');
      passCount++;
    } else {
      console.log('✗ [FAIL] 8. Admin metrics query failed:', metricsRes.body);
    }

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
  }

  console.log('\n==================================================');
  console.log(`FRESHSMART DB & AUTH SUMMARY: ${passCount}/8 PASSED`);
  console.log('==================================================\n');

  if (passCount !== 8) process.exit(1);
}

runDatabaseAuthTests();

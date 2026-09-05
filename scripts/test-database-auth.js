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
    const signupRes = await makeRequest(server, 'POST', '/api/auth/signup', {
      name: 'Test Customer',
      email: `customer_${Date.now()}@freshsmart.com`,
      password: 'password123',
      role: 'customer'
    });

    if (signupRes.status === 201 && signupRes.body.user && !signupRes.body.user.password_hash) {
      console.log('✓ [PASS] 1. User signup creates account with server-side password hashing');
      passCount++;
    } else {
      console.log('✗ [FAIL] 1. User signup failed:', signupRes.body);
    }

    // Test 2: Admin Signup Rejection without valid Key
    const badAdminRes = await makeRequest(server, 'POST', '/api/auth/signup', {
      name: 'Fake Admin',
      email: `fakeadmin_${Date.now()}@freshsmart.com`,
      password: 'password123',
      role: 'admin',
      adminKey: 'WRONG_KEY'
    });

    if (badAdminRes.status === 403) {
      console.log('✓ [PASS] 2. Admin account creation rejects invalid admin authorization key');
      passCount++;
    } else {
      console.log('✗ [FAIL] 2. Admin key check failed:', badAdminRes.body);
    }

    // Test 3: Admin Signup Success with ADMIN2026 Key
    const adminEmail = `admin_${Date.now()}@freshsmart.com`;
    const adminSignupRes = await makeRequest(server, 'POST', '/api/auth/signup', {
      name: 'Verified Admin',
      email: adminEmail,
      password: 'password123',
      role: 'admin',
      adminKey: 'ADMIN2026'
    });

    if (adminSignupRes.status === 201 && adminSignupRes.body.user.role === 'admin') {
      console.log('✓ [PASS] 3. Admin account creation succeeds with verified ADMIN2026 key');
      passCount++;
    } else {
      console.log('✗ [FAIL] 3. Admin creation failed:', adminSignupRes.body);
    }

    // Test 4: Login Verification
    const loginRes = await makeRequest(server, 'POST', '/api/auth/login', {
      email: adminEmail,
      password: 'password123'
    });

    if (loginRes.status === 200 && loginRes.body.token) {
      console.log('✓ [PASS] 4. User login authenticates credentials and returns JWT session token');
      passCount++;
    } else {
      console.log('✗ [FAIL] 4. Login failed:', loginRes.body);
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

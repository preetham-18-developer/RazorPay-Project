const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const BUSINESS_DB_FILE = path.join(DATA_DIR, 'business-database.json');
const EVENTS_FILE = path.join(DATA_DIR, 'freshmart-events.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const PAYMENTS_FILE = path.join(DATA_DIR, 'payments.json');
const DISPUTES_FILE = path.join(DATA_DIR, 'disputes.json');
const ACTION_RECORDS_FILE = path.join(DATA_DIR, 'action-records.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const EVIDENCE_FILE = path.join(DATA_DIR, 'evidence.json');

async function cleanTestData() {
  console.log('==================================================');
  console.log('CLEANING ALL TEST DATA FROM ADMIN PORTAL');
  console.log('==================================================\n');

  // 1. Clean business-database.json
  if (fs.existsSync(BUSINESS_DB_FILE)) {
    try {
      const db = JSON.parse(fs.readFileSync(BUSINESS_DB_FILE, 'utf8'));
      
      // Preserve products catalog
      const products = db.products || [];

      // Create clean seed users
      const customerPasswordHash = await bcrypt.hash('password123', 10);
      const adminPasswordHash = await bcrypt.hash('admin1234', 10);

      const cleanUsers = [
        {
          id: 'usr_customer_demo',
          name: 'Demo Customer',
          email: 'customer@freshsmart.com',
          password_hash: customerPasswordHash,
          role: 'customer',
          created_at: new Date().toISOString()
        },
        {
          id: 'usr_admin_master',
          name: 'Risk Manager Admin',
          email: 'admin@gmail.com',
          password_hash: adminPasswordHash,
          role: 'admin',
          created_at: new Date().toISOString()
        }
      ];

      const cleanDb = {
        users: cleanUsers,
        products: products,
        orders: [],
        queries: [],
        feedback: [],
        disputes: []
      };

      fs.writeFileSync(BUSINESS_DB_FILE, JSON.stringify(cleanDb, null, 2), 'utf8');
      console.log('✓ Reset data/business-database.json (0 orders, 0 queries, 0 feedback, 0 disputes)');
    } catch (e) {
      console.error('Error cleaning business-database.json:', e);
    }
  }

  // 2. Clean freshmart-events.json
  fs.writeFileSync(EVENTS_FILE, JSON.stringify([], null, 2), 'utf8');
  console.log('✓ Reset data/freshmart-events.json ([] empty)');

  // 3. Clean orders.json
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2), 'utf8');
  console.log('✓ Reset data/orders.json ([] empty)');

  // 4. Clean payments.json
  fs.writeFileSync(PAYMENTS_FILE, JSON.stringify([], null, 2), 'utf8');
  console.log('✓ Reset data/payments.json ([] empty)');

  // 5. Clean disputes.json
  fs.writeFileSync(DISPUTES_FILE, JSON.stringify([], null, 2), 'utf8');
  console.log('✓ Reset data/disputes.json ([] empty)');

  // 6. Clean action-records.json
  fs.writeFileSync(ACTION_RECORDS_FILE, JSON.stringify([], null, 2), 'utf8');
  console.log('✓ Reset data/action-records.json ([] empty)');

  // 7. Clean reviews.json
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify({}, null, 2), 'utf8');
  console.log('✓ Reset data/reviews.json ({} empty)');

  // 8. Clean evidence.json
  fs.writeFileSync(EVIDENCE_FILE, JSON.stringify({}, null, 2), 'utf8');
  console.log('✓ Reset data/evidence.json ({} empty)');

  console.log('\n==================================================');
  console.log('ADMIN PORTAL DATA CLEANUP COMPLETE! ALL TEST DATA REMOVED.');
  console.log('==================================================\n');
}

cleanTestData();

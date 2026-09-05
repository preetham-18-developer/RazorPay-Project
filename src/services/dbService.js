/**
 * Supabase & Persistent Business Database Service Layer for FreshSmart + DisputeShield
 * Manages authoritative business records for Users, Products, Orders, Payments, Queries, Feedback, & Disputes.
 */

const { supabase } = require('../config/supabase');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const freshmartEventService = require('./freshmartEventService');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'freshmart-products.json');
const BUSINESS_DB_FILE = path.join(DATA_DIR, 'business-database.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadBusinessDb() {
  ensureDataDir();
  if (!fs.existsSync(BUSINESS_DB_FILE)) {
    const initialDb = {
      users: [],
      products: loadInitialCatalog(),
      orders: [],
      queries: [],
      feedback: [],
      disputes: []
    };
    fs.writeFileSync(BUSINESS_DB_FILE, JSON.stringify(initialDb, null, 2), 'utf8');
    return initialDb;
  }
  try {
    const raw = fs.readFileSync(BUSINESS_DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      users: parsed.users || [],
      products: (parsed.products && parsed.products.length > 0) ? parsed.products : loadInitialCatalog(),
      orders: parsed.orders || [],
      queries: parsed.queries || [],
      feedback: parsed.feedback || [],
      disputes: parsed.disputes || []
    };
  } catch (e) {
    return {
      users: [],
      products: loadInitialCatalog(),
      orders: [],
      queries: [],
      feedback: [],
      disputes: []
    };
  }
}

function saveBusinessDb(db) {
  ensureDataDir();
  fs.writeFileSync(BUSINESS_DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function loadInitialCatalog() {
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    }
  } catch (e) {
    // fallback
  }
  return [
    {
      product_id: "prod_fm_01",
      sku: "RICE-5KG-001",
      name: "Royal Organic Basmati Rice (1kg)",
      category: "Staples & Grains",
      price: 180,
      description: "Aromatic long-grain aged premium basmati rice sourced from Himalayan foothills.",
      image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
      stock_status: "IN_STOCK",
      is_active: true
    },
    {
      product_id: "prod_fm_02",
      sku: "MILK-1L-002",
      name: "Farm Fresh A2 Whole Cow Milk (1L)",
      category: "Dairy & Cold Store",
      price: 65,
      description: "Pasteurized, unhomogenized pure A2 cow milk delivered fresh daily.",
      image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80",
      stock_status: "IN_STOCK",
      is_active: true
    },
    {
      product_id: "prod_fm_03",
      sku: "OIL-1L-003",
      name: "Cold-Pressed Mustard Oil (1L)",
      category: "Staples & Oils",
      price: 190,
      description: "Traditional Kachi Ghani cold-pressed mustard oil with pungent aroma.",
      image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",
      stock_status: "IN_STOCK",
      is_active: true
    },
    {
      product_id: "prod_fm_04",
      sku: "APPLES-1KG-004",
      name: "Fresh Royal Gala Apples (1kg)",
      category: "Fruits & Produce",
      price: 160,
      description: "Crisp, sweet, hand-picked fresh orchard apples from Himachal Pradesh.",
      image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80",
      stock_status: "IN_STOCK",
      is_active: true
    },
    {
      product_id: "prod_fm_05",
      sku: "TEA-500G-005",
      name: "Darjeeling First Flush Black Tea (250g)",
      category: "Beverages & Teas",
      price: 280,
      description: "Muscatel notes from high-altitude single estate Darjeeling gardens.",
      image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80",
      stock_status: "IN_STOCK",
      is_active: true
    },
    {
      product_id: "prod_fm_06",
      sku: "BREAD-400G-006",
      name: "Artisanal Multigrain Sourdough Bread (400g)",
      category: "Bakery",
      price: 55,
      description: "Naturally fermented 24-hour sourdough loaf baked with ancient grains.",
      image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80",
      stock_status: "IN_STOCK",
      is_active: true
    },
    {
      product_id: "prod_fm_07",
      sku: "HONEY-500G-007",
      name: "Raw Wildflower Organic Honey (500g)",
      category: "Pantry & Sweeteners",
      price: 290,
      description: "Unfiltered, unpasteurized natural honey collected from forest beehives.",
      image: "https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=600&q=80",
      stock_status: "IN_STOCK",
      is_active: true
    },
    {
      product_id: "prod_fm_08",
      sku: "COFFEE-200G-008",
      name: "South Indian Filter Coffee Roast (200g)",
      category: "Beverages & Coffee",
      price: 140,
      description: "80:20 Arabica-Chicory dark roast blend for authentic filter kaapi.",
      image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80",
      stock_status: "IN_STOCK",
      is_active: true
    },
    {
      product_id: "prod_fm_09",
      sku: "PANTRY-RES-18999",
      name: "Gourmet Pantry Reserve",
      category: "Pantry & Gourmet",
      price: 499,
      description: "Exclusive artisanal hamper with Kashmir Mongra Saffron (5g), Cold-Pressed Truffle Olive Oil (500ml), and Aged Balsamic Vinegar.",
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
      stock_status: "IN_STOCK",
      is_active: true
    }
  ];
}

// -------------------------------------------------------------
// USER / AUTHENTICATION DATABASE OPERATIONS
// -------------------------------------------------------------

async function createUser({ name, email, password, role = 'customer' }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: name || email.split('@')[0],
    email: email.toLowerCase().trim(),
    password_hash: passwordHash,
    role: role,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select('id, name, email, role, created_at')
      .single();

    if (!error && data) {
      const db = loadBusinessDb();
      db.users.push(user);
      saveBusinessDb(db);
      return data;
    }
  } catch (e) {
    // Supabase table fallback
  }

  const db = loadBusinessDb();
  db.users.push(user);
  saveBusinessDb(db);
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

async function findUserByEmail(email) {
  if (!email) return null;
  const targetEmail = email.toLowerCase().trim();

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', targetEmail)
      .single();

    if (!error && data) return data;
  } catch (e) {
    // fallback
  }

  const db = loadBusinessDb();
  return db.users.find(u => u.email === targetEmail) || null;
}

async function findUserById(id) {
  if (!id) return null;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('id', id)
      .single();

    if (!error && data) return data;
  } catch (e) {
    // fallback
  }

  const db = loadBusinessDb();
  const u = db.users.find(x => x.id === id);
  if (!u) return null;
  const { password_hash, ...safeUser } = u;
  return safeUser;
}

// -------------------------------------------------------------
// PRODUCTS DATABASE OPERATIONS
// -------------------------------------------------------------

async function getProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true);

    if (!error && Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch (e) {
    // fallback
  }

  const db = loadBusinessDb();
  return db.products;
}

async function getProductById(productId) {
  const catalog = await getProducts();
  return catalog.find(p => p.product_id === productId || p.id === productId || p.sku === productId) || null;
}

// -------------------------------------------------------------
// ORDERS DATABASE OPERATIONS (UNIFIED SINGLE SOURCE OF TRUTH)
// -------------------------------------------------------------

function getOrderByIdSync(orderId) {
  const db = loadBusinessDb();
  return db.orders.find(o => o.order_id === orderId || o.id === orderId) || null;
}

async function createOrder(orderData) {
  const orderRecord = {
    order_id: orderData.order_id,
    user_id: orderData.user_id || 'cust_fm_demo_user',
    customer_name: orderData.customer_name || 'Demo Customer',
    customer_email: orderData.customer_email || 'customer@freshsmart.com',
    total_amount: orderData.total_amount,
    payment_status: orderData.payment_status || 'CAPTURED',
    payment_id: orderData.payment_id,
    fulfillment_status: 'UNFULFILLED',
    delivery_status: 'PENDING',
    otp_verified: false,
    tracking_number: null,
    items: orderData.items || [],
    created_at: orderData.created_at || new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('orders')
      .insert([orderRecord])
      .select('*')
      .single();

    if (!error && data) {
      const db = loadBusinessDb();
      const idx = db.orders.findIndex(o => o.order_id === data.order_id);
      if (idx !== -1) db.orders[idx] = data;
      else db.orders.unshift(data);
      saveBusinessDb(db);
      return data;
    }
  } catch (e) {
    // fallback
  }

  const db = loadBusinessDb();
  const existingIdx = db.orders.findIndex(o => o.order_id === orderRecord.order_id);
  if (existingIdx !== -1) db.orders[existingIdx] = { ...db.orders[existingIdx], ...orderRecord };
  else db.orders.unshift(orderRecord);
  saveBusinessDb(db);
  return orderRecord;
}

async function getAllOrdersAdmin() {
  const db = loadBusinessDb();
  let baseOrders = [];

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      baseOrders = data;
    }
  } catch (e) {
    // fallback
  }

  if (baseOrders.length === 0) {
    baseOrders = Array.isArray(db.orders) ? db.orders : [];
  }

  const orderMap = new Map();

  // 1. Seed with local JSON db orders
  (Array.isArray(db.orders) ? db.orders : []).forEach(o => {
    if (o && o.order_id) orderMap.set(o.order_id, { ...o });
  });

  // 2. Merge Supabase base orders
  baseOrders.forEach(o => {
    if (o && o.order_id) {
      const existing = orderMap.get(o.order_id) || {};
      orderMap.set(o.order_id, { ...existing, ...o });
    }
  });

  // 3. Merge replayed state from freshmartEventService
  try {
    const allEvents = freshmartEventService.loadAllEvents();
    const eventOrderIds = Array.from(new Set(allEvents.map(e => e.order_id)));

    eventOrderIds.forEach(orderId => {
      const replayed = freshmartEventService.replayOrderState(orderId);
      if (replayed) {
        const existing = orderMap.get(orderId);
        if (existing) {
          existing.fulfillment_status = replayed.fulfillment_status || existing.fulfillment_status;
          existing.delivery_status = replayed.delivery_status || existing.delivery_status;
          existing.tracking_number = replayed.tracking_number || existing.tracking_number;
          existing.otp_verified = typeof replayed.otp_verified === 'boolean' ? replayed.otp_verified : existing.otp_verified;
          existing.event_count = replayed.event_count || existing.event_count;
          existing.timeline = replayed.timeline || existing.timeline;
          if (replayed.total_amount && !existing.total_amount) existing.total_amount = replayed.total_amount;
          if (replayed.ordered_items && replayed.ordered_items.length > 0 && (!existing.items || existing.items.length === 0)) {
            existing.items = replayed.ordered_items;
          }
          orderMap.set(orderId, existing);
        } else {
          const newOrd = {
            order_id: orderId,
            user_id: replayed.customer_id || 'cust_fm_demo_user',
            customer_name: 'Customer',
            customer_email: 'customer@freshsmart.com',
            total_amount: replayed.total_amount || 0,
            payment_status: replayed.payment_status || 'CAPTURED',
            payment_id: replayed.captured_payments[0]?.payment_id || `pay_evt_${orderId}`,
            fulfillment_status: replayed.fulfillment_status || 'UNFULFILLED',
            delivery_status: replayed.delivery_status || 'PENDING',
            otp_verified: Boolean(replayed.otp_verified),
            tracking_number: replayed.tracking_number || null,
            items: replayed.ordered_items || [],
            event_count: replayed.event_count || 1,
            timeline: replayed.timeline || [],
            created_at: replayed.timeline[0]?.timestamp || new Date().toISOString()
          };
          orderMap.set(orderId, newOrd);
        }
      }
    });
  } catch (e) {
    // fallback
  }

  const result = Array.from(orderMap.values());
  result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return result;
}

async function getOrdersForUser(userId) {
  const allOrders = await getAllOrdersAdmin();
  if (!userId) return allOrders;
  return allOrders.filter(o =>
    o.user_id === userId ||
    o.customer_id === userId ||
    userId === 'cust_fm_demo_user' ||
    o.customer_email === userId
  );
}

async function getOrderById(orderId) {
  const allOrders = await getAllOrdersAdmin();
  return allOrders.find(o => o.order_id === orderId || o.id === orderId) || getOrderByIdSync(orderId);
}

async function updateOrderFulfillment(orderId, updateFields) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update(updateFields)
      .eq('order_id', orderId)
      .select('*')
      .single();

    if (!error && data) {
      const db = loadBusinessDb();
      const idx = db.orders.findIndex(o => o.order_id === orderId);
      if (idx !== -1) db.orders[idx] = { ...db.orders[idx], ...updateFields };
      else db.orders.unshift({ order_id: orderId, ...updateFields });
      saveBusinessDb(db);
      return data;
    }
  } catch (e) {
    // fallback
  }

  const db = loadBusinessDb();
  const idx = db.orders.findIndex(o => o.order_id === orderId);
  if (idx !== -1) {
    db.orders[idx] = { ...db.orders[idx], ...updateFields };
  } else {
    db.orders.unshift({ order_id: orderId, ...updateFields });
  }
  saveBusinessDb(db);
  return db.orders.find(o => o.order_id === orderId) || null;
}

// -------------------------------------------------------------
// DISPUTES DATABASE OPERATIONS
// -------------------------------------------------------------

function getDisputeByIdSync(disputeId) {
  const db = loadBusinessDb();
  return db.disputes.find(d => d.id === disputeId || d.dispute_id === disputeId) || null;
}

function getAllDisputesSync() {
  const db = loadBusinessDb();
  return db.disputes;
}

function createDisputeSync(disputeData) {
  const disputeRecord = {
    id: disputeData.id || disputeData.dispute_id,
    dispute_id: disputeData.id || disputeData.dispute_id,
    order_id: disputeData.order_id,
    payment_id: disputeData.payment_id,
    amount: disputeData.amount,
    currency: disputeData.currency || 'INR',
    reason_code: disputeData.reason_code,
    customer_claim: disputeData.customer_claim || '',
    status: disputeData.status || 'under_review',
    merchant_id: disputeData.merchant_id || 'merchant_fm_01',
    created_at: disputeData.created_at || new Date().toISOString(),
    due_by: disputeData.due_by || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };

  const db = loadBusinessDb();
  const idx = db.disputes.findIndex(d => d.id === disputeRecord.id);
  if (idx !== -1) db.disputes[idx] = disputeRecord;
  else db.disputes.unshift(disputeRecord);
  saveBusinessDb(db);
  return disputeRecord;
}

async function createDispute(disputeData) {
  const disputeRecord = createDisputeSync(disputeData);

  try {
    const { data, error } = await supabase
      .from('disputes')
      .insert([disputeRecord])
      .select('*')
      .single();

    if (!error && data) {
      return data;
    }
  } catch (e) {
    // fallback
  }

  return disputeRecord;
}

async function getDisputeById(disputeId) {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .eq('id', disputeId)
      .single();

    if (!error && data) return data;
  } catch (e) {
    // fallback
  }

  return getDisputeByIdSync(disputeId);
}

async function getAllDisputes() {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) return data;
  } catch (e) {
    // fallback
  }

  return getAllDisputesSync();
}

// -------------------------------------------------------------
// CUSTOMER QUERIES DATABASE OPERATIONS
// -------------------------------------------------------------

async function createQuery({ user_id, customer_name, customer_email, subject, message, order_id, category = 'General' }) {
  const queryRecord = {
    id: `qry_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    user_id: user_id || 'guest',
    customer_name: customer_name || 'Guest User',
    customer_email: customer_email || 'guest@freshsmart.com',
    subject,
    message,
    order_id: order_id || null,
    category,
    status: 'OPEN',
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('queries')
      .insert([queryRecord])
      .select('*')
      .single();

    if (!error && data) {
      const db = loadBusinessDb();
      db.queries.unshift(data);
      saveBusinessDb(db);
      return data;
    }
  } catch (e) {
    // fallback
  }

  const db = loadBusinessDb();
  db.queries.unshift(queryRecord);
  saveBusinessDb(db);
  return queryRecord;
}

async function getQueriesForUser(userId) {
  try {
    const { data, error } = await supabase
      .from('queries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) return data;
  } catch (e) {
    // fallback
  }

  const db = loadBusinessDb();
  return db.queries.filter(q => q.user_id === userId);
}

async function getAllQueriesAdmin() {
  try {
    const { data, error } = await supabase
      .from('queries')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) return data;
  } catch (e) {
    // fallback
  }

  const db = loadBusinessDb();
  return db.queries;
}

async function updateQueryStatus(queryId, status) {
  try {
    const { data, error } = await supabase
      .from('queries')
      .update({ status })
      .eq('id', queryId)
      .select('*')
      .single();

    if (!error && data) {
      const db = loadBusinessDb();
      const q = db.queries.find(x => x.id === queryId);
      if (q) q.status = status;
      saveBusinessDb(db);
      return data;
    }
  } catch (e) {
    // fallback
  }

  const db = loadBusinessDb();
  const q = db.queries.find(x => x.id === queryId);
  if (q) q.status = status;
  saveBusinessDb(db);
  return q || null;
}

// -------------------------------------------------------------
// FEEDBACK DATABASE OPERATIONS
// -------------------------------------------------------------

async function submitFeedback({ user_id, customer_name, rating, feedback_text, order_id }) {
  const feedbackRecord = {
    id: `fb_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    user_id: user_id || 'guest',
    customer_name: customer_name || 'Customer',
    rating: parseInt(rating, 10) || 5,
    feedback_text: feedback_text || '',
    order_id: order_id || null,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('feedback')
      .insert([feedbackRecord])
      .select('*')
      .single();

    if (!error && data) {
      const db = loadBusinessDb();
      db.feedback.unshift(data);
      saveBusinessDb(db);
      return data;
    }
  } catch (e) {
    // fallback
  }

  const db = loadBusinessDb();
  db.feedback.unshift(feedbackRecord);
  saveBusinessDb(db);
  return feedbackRecord;
}

async function getAllFeedbackAdmin() {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) return data;
  } catch (e) {
    // fallback
  }

  const db = loadBusinessDb();
  return db.feedback;
}

// -------------------------------------------------------------
// ADMIN LIVE METRICS AGGREGATION
// -------------------------------------------------------------

async function getAdminMetrics() {
  const db = loadBusinessDb();
  const orders = await getAllOrdersAdmin();
  const queries = await getAllQueriesAdmin();
  const feedback = await getAllFeedbackAdmin();
  const usersCount = db.users.length;

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const successfulPayments = orders.filter(o => o.payment_status === 'CAPTURED').length;
  const openQueries = queries.filter(q => q.status === 'OPEN').length;
  
  const avgRating = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + (f.rating || 5), 0) / feedback.length).toFixed(1)
    : "0.0";

  return {
    total_customers: usersCount,
    total_orders: totalOrders,
    total_revenue: totalRevenue,
    successful_payments: successfulPayments,
    open_queries: openQueries,
    total_feedback: feedback.length,
    average_rating: avgRating
  };
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  getProducts,
  getProductById,
  createOrder,
  getOrdersForUser,
  getAllOrdersAdmin,
  getOrderById,
  getOrderByIdSync,
  updateOrderFulfillment,
  createDispute,
  createDisputeSync,
  getDisputeById,
  getDisputeByIdSync,
  getAllDisputes,
  getAllDisputesSync,
  createQuery,
  getQueriesForUser,
  getAllQueriesAdmin,
  updateQueryStatus,
  submitFeedback,
  getAllFeedbackAdmin,
  getAdminMetrics
};

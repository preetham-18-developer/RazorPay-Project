/**
 * Authoritative Dispute Data Repository
 * Serves as the single gateway for AI DisputeShield case assembly.
 * Combines authoritative business data (from dbService) and operational lifecycle events (from freshmartEventService).
 * Strictly adheres to Information Asymmetry rules: NEVER imports or exposes ground truth.
 */

const fs = require('fs');
const path = require('path');
const dbService = require('./dbService');
const freshmartEventService = require('./freshmartEventService');
const freshmartEvidenceService = require('./freshmartEvidenceService');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

function loadJsonFile(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return null;
  }
}

/**
 * Retrieves all disputes across authoritative business DB and offline benchmark synthetic dataset.
 */
function getAllDisputes() {
  // 1. Get disputes from Authoritative Business Database
  const dbDisputes = dbService.getAllDisputesSync();

  // 2. Load synthetic benchmark disputes if present (for offline regression tests)
  const legacyDisputes = loadJsonFile('disputes.json') || [];

  // Merge cleanly by ID without duplicates
  const disputeMap = new Map();
  dbDisputes.forEach(d => disputeMap.set(d.id || d.dispute_id, d));
  legacyDisputes.forEach(d => {
    if (!disputeMap.has(d.id)) {
      disputeMap.set(d.id, d);
    }
  });

  return Array.from(disputeMap.values());
}

/**
 * Assembles a complete case dossier for a given disputeId:
 * { dispute, payment, order, evidence }
 */
function getAssembledCase(disputeId) {
  if (!disputeId) return null;

  // 1. Check Authoritative Business Database for dispute
  let dispute = dbService.getDisputeByIdSync(disputeId);
  let order = null;
  let payment = null;
  let evidence = [];

  if (dispute) {
    // Real Business DB Dispute
    const orderId = dispute.order_id;
    let rawOrder = dbService.getOrderByIdSync(orderId);

    // Replay operational event ledger for order state & evidence
    const state = freshmartEventService.replayOrderState(orderId);
    evidence = freshmartEvidenceService.generateEvidenceForOrder(orderId);

    const paymentId = dispute.payment_id || (rawOrder ? rawOrder.payment_id : `pay_${orderId}`);
    let amount = dispute.amount || (rawOrder ? rawOrder.total_amount : 129900);
    if (amount < 100000 && amount > 0) {
      amount = amount * 100;
    }

    dispute.amount = amount;

    payment = {
      id: paymentId,
      payment_id: paymentId,
      amount: amount,
      currency: dispute.currency || 'INR',
      method: 'card',
      customer_id: rawOrder ? (rawOrder.user_id || rawOrder.customer_id) : (state ? state.customer_id : 'cust_fm_demo_user'),
      created_at: dispute.created_at || new Date().toISOString()
    };

    order = {
      id: orderId,
      order_id: orderId,
      payment_id: paymentId,
      amount: amount,
      total_amount: amount,
      delivery_status: rawOrder?.delivery_status || state?.delivery_status || 'DELIVERED',
      fulfillment_status: rawOrder?.fulfillment_status || state?.fulfillment_status || 'UNFULFILLED',
      customer_name: rawOrder?.customer_name || 'Demo Customer',
      customer_email: rawOrder?.customer_email || 'customer@freshsmart.com',
      user_id: rawOrder?.user_id || state?.customer_id || 'cust_fm_demo_user',
      items: (rawOrder && Array.isArray(rawOrder.items) && rawOrder.items.length > 0)
        ? rawOrder.items
        : (state?.ordered_items || []),
      skus: (state?.ordered_items || rawOrder?.items || []).map(i => i.sku),
      created_at: dispute.created_at || new Date().toISOString()
    };

    return {
      dispute,
      payment,
      order,
      evidence
    };
  }

  // 2. Fallback to offline synthetic benchmark files for legacy test suite compatibility (e.g., disp_SYN*)
  const legacyDisputes = loadJsonFile('disputes.json') || [];
  dispute = legacyDisputes.find(d => d.id === disputeId);
  if (!dispute) return null;

  const payments = loadJsonFile('payments.json') || [];
  payment = payments.find(p => p.id === dispute.payment_id) || null;

  const orders = loadJsonFile('orders.json') || [];
  order = orders.find(o => o.payment_id === dispute.payment_id || o.id === dispute.order_id) || null;

  const evidenceMap = loadJsonFile('evidence.json') || {};
  evidence = evidenceMap[disputeId] || [];

  return {
    dispute,
    payment,
    order,
    evidence
  };
}

module.exports = {
  getAllDisputes,
  getAssembledCase
};

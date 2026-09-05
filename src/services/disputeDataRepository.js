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
    order = dbService.getOrderByIdSync(orderId);

    // Replay operational event ledger for order state & evidence
    const state = freshmartEventService.replayOrderState(orderId);
    evidence = freshmartEvidenceService.generateEvidenceForOrder(orderId);

    const paymentId = dispute.payment_id || (order ? order.payment_id : `pay_${orderId}`);
    const amount = dispute.amount || (order ? order.total_amount : 129900);

    payment = {
      id: paymentId,
      amount: amount,
      currency: dispute.currency || 'INR',
      method: 'card',
      customer_id: order ? order.user_id : 'cust_fm_demo_user',
      created_at: dispute.created_at || new Date().toISOString()
    };

    if (!order && state) {
      order = {
        id: orderId,
        payment_id: paymentId,
        amount: amount,
        items: state.ordered_items || [],
        skus: (state.ordered_items || []).map(i => i.sku),
        created_at: dispute.created_at
      };
    }

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

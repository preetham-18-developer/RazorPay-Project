/**
 * FreshMart DisputeShield Pipeline Bridge Service
 * Connects operational FreshMart order events to DisputeShield core risk evaluation pipeline.
 * Strictly adheres to Information Asymmetry rules: NEVER imports or exposes evaluation ground truth.
 */

const fs = require('fs');
const path = require('path');
const freshmartEventService = require('./freshmartEventService');
const freshmartEvidenceService = require('./freshmartEvidenceService');
const dbService = require('./dbService');

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

function saveJsonFile(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Builds an operational evidence dossier for a FreshMart order without ground truth.
 */
function buildOperationalDossier(orderId) {
  const state = freshmartEventService.replayOrderState(orderId);
  if (!state) {
    throw new Error(`Order ${orderId} not found in event ledger.`);
  }

  const evidence = freshmartEvidenceService.generateEvidenceForOrder(orderId);
  const events = freshmartEventService.getEventsForOrder(orderId);

  return {
    order_id: orderId,
    payment_id: state.captured_payments[0]?.payment_id || `pay_sim_${orderId}`,
    total_amount: state.total_amount || 129900,
    payment_status: state.payment_status,
    fulfillment_status: state.fulfillment_status,
    delivery_status: state.delivery_status,
    otp_verified: state.otp_verified,
    otp_status: state.otp_status,
    customer_response: state.customer_response,
    ordered_items: state.ordered_items || [],
    packed_items: state.packed_items || [],
    events: events,
    evidence: evidence
  };
}

/**
 * Maps FreshMart evidence dossier to DisputeShield evidence list format.
 */
function mapFreshMartEvidence(dossier) {
  return dossier.evidence || [];
}

/**
 * Submits a FreshMart order dispute into DisputeShield's authoritative Business Database & Event Ledger.
 */
function createDisputeFromFreshMartOrder({ order_id, reason_code = 'PRODUCT_NOT_RECEIVED', customer_claim = '' }) {
  if (!order_id) {
    const err = new Error('order_id is required to file a dispute.');
    err.statusCode = 400;
    throw err;
  }

  const state = freshmartEventService.replayOrderState(order_id);
  if (!state) {
    const err = new Error(`Order ${order_id} not found in FreshMart event ledger.`);
    err.statusCode = 404;
    throw err;
  }

  if (!state.order_placed && (!state.ordered_items || state.ordered_items.length === 0)) {
    const err = new Error(`Dispute unavailable: Order ${order_id} has not been placed or created.`);
    err.statusCode = 400;
    throw err;
  }

  if (state.payment_status !== 'CAPTURED' && (!state.captured_payments || state.captured_payments.length === 0)) {
    const err = new Error(`Dispute unavailable: Payment has not been captured for order ${order_id} (Current status: '${state.payment_status}').`);
    err.statusCode = 400;
    throw err;
  }

  const disputeId = `disp_fm_${Date.now()}`;
  const paymentId = state.captured_payments[0]?.payment_id || `pay_sim_${order_id}`;
  const amount = state.total_amount || 129900;
  const timestamp = new Date().toISOString();
  const dueBy = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Append DISPUTE_FILED event to append-only event ledger
  freshmartEventService.appendEvent({
    order_id: order_id,
    dispute_id: disputeId,
    event_type: 'DISPUTE_FILED',
    source: 'freshmart_customer_app',
    actor: 'cust_fm_demo_user',
    metadata: {
      reason_code: reason_code,
      customer_claim: customer_claim,
      amount: amount
    }
  });

  // 2. Build operational dossier
  const dossier = buildOperationalDossier(order_id);

  // 3. Persist Dispute Record into Authoritative Business Database (dbService)
  const newDispute = {
    id: disputeId,
    dispute_id: disputeId,
    order_id: order_id,
    payment_id: paymentId,
    amount: amount,
    currency: 'INR',
    reason_code: reason_code,
    status: 'under_review',
    created_at: timestamp,
    due_by: dueBy,
    customer_claim: customer_claim,
    merchant_id: 'merchant_fm_01',
    source: 'freshmart_bridge'
  };

  dbService.createDisputeSync(newDispute);

  return {
    success: true,
    dispute_id: disputeId,
    order_id: order_id,
    payment_id: paymentId,
    reason_code: reason_code,
    customer_claim: customer_claim,
    amount: amount,
    dossier: dossier
  };
}

module.exports = {
  buildOperationalDossier,
  mapFreshMartEvidence,
  createDisputeFromFreshMartOrder
};

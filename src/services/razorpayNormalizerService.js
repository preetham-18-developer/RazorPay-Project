/**
 * Razorpay Payload Normalizer Service
 * Transforms raw Razorpay Webhook & REST API payloads into normalized DisputeShield internal case structures.
 * Ensures strict decoupling between raw Razorpay API schemas and core risk engine contracts.
 */

const REASON_CODE_MAP = {
  'product_not_received': 'product_not_received',
  'merchandise_not_as_described': 'product_defective',
  'product_defective': 'product_defective',
  'unauthorized_transaction': 'fraudulent_transaction',
  'fraudulent': 'fraudulent_transaction',
  'duplicate_transaction': 'duplicate_charge',
  'duplicate': 'duplicate_charge',
  'service_not_rendered': 'service_not_rendered',
  'credit_not_processed': 'credit_not_processed'
};

function normalizeReasonCode(rawReason) {
  if (!rawReason) return 'product_not_received';
  const clean = String(rawReason).toLowerCase().trim();
  return REASON_CODE_MAP[clean] || 'product_not_received';
}

/**
 * Transforms a raw Razorpay webhook or dispute API entity into DisputeShield format.
 * Expects raw dispute entity or full webhook payload { event, payload: { dispute: { entity: ... } } }
 */
function normalizeRazorpayDispute(rawInput) {
  if (!rawInput) return null;

  let entity = rawInput;
  let eventType = 'dispute.created';

  // Handle standard Razorpay webhook wrapper structure
  if (rawInput.event && rawInput.payload && rawInput.payload.dispute) {
    eventType = rawInput.event;
    entity = rawInput.payload.dispute.entity || rawInput.payload.dispute;
  }

  const disputeId = entity.id || `disp_RZP_${Date.now()}`;
  const paymentId = entity.payment_id || `pay_RZP_${Date.now()}`;
  const amountPaise = typeof entity.amount === 'number' ? entity.amount : 249900;
  const reasonCode = normalizeReasonCode(entity.reason_code || entity.reason);
  const reasonDescription = entity.reason_description || entity.description || `Razorpay dispute claim for ${reasonCode.replace(/_/g, ' ')}.`;

  const createdAt = entity.created_at
    ? (typeof entity.created_at === 'number' ? new Date(entity.created_at * 1000).toISOString() : new Date(entity.created_at).toISOString())
    : new Date().toISOString();

  const respondBy = entity.respond_by
    ? (typeof entity.respond_by === 'number' ? entity.respond_by : Math.floor(new Date(entity.respond_by).getTime() / 1000))
    : Math.floor((Date.now() + 86400000 * 7) / 1000);

  const disputeObj = {
    id: disputeId,
    payment_id: paymentId,
    amount: amountPaise,
    reason_code: reasonCode,
    reason_description: reasonDescription,
    status: (entity.status || 'open').toLowerCase(),
    respond_by: respondBy,
    created_at: createdAt
  };

  // Associated Payment Entity
  const rawPayment = (rawInput.payload && rawInput.payload.payment && rawInput.payload.payment.entity) || entity.payment || {};
  const paymentObj = {
    id: paymentId,
    amount: amountPaise,
    method: (rawPayment.method || 'card').toLowerCase(),
    created_at: rawPayment.created_at ? new Date(rawPayment.created_at * 1000).toISOString() : createdAt,
    customer_id: rawPayment.customer_id || `cust_RZP_${paymentId.slice(-6)}`,
    device_id: rawPayment.device_id || `dev_RZP_${paymentId.slice(-4)}`,
    ip_address: rawPayment.ip_address || '127.0.0.1'
  };

  // Associated Order Entity
  const rawOrder = (rawInput.payload && rawInput.payload.order && rawInput.payload.order.entity) || {};
  const orderObj = {
    id: rawOrder.id || `order_RZP_${disputeId.slice(-6)}`,
    payment_id: paymentId,
    items: rawOrder.items || [{ name: 'Merchant Order Item', qty: 1, price: amountPaise }],
    delivery_status: rawOrder.delivery_status || 'delivered',
    delivery_confirmed_at: rawOrder.delivery_confirmed_at || createdAt,
    shipping_address: rawOrder.shipping_address || {
      line1: '123 Main St',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560001',
      country: 'IN'
    }
  };

  // Default initial evidence structure
  const evidenceObj = [
    { type: 'payment_confirmation', doc_id: `doc_${disputeId}_payment`, present: true },
    { type: 'delivery_confirmation', doc_id: `doc_${disputeId}_delivery`, present: true }
  ];

  return {
    event: eventType,
    dispute: disputeObj,
    payment: paymentObj,
    order: orderObj,
    evidence: evidenceObj
  };
}

module.exports = {
  normalizeReasonCode,
  normalizeRazorpayDispute
};

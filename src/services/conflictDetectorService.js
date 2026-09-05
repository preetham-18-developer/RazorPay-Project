/**
 * Deterministic Conflict Detector Service
 * Identifies contradictory operational signals between customer claim, order delivery status, and payment telemetry.
 * Does not force AI judgements; flags clear contradictions for investigation.
 */

const disputeService = require('./disputeService');
const { normalizeReasonCode } = require('../constants/evidenceMatrix');

function detectConflicts(disputeId) {
  const caseData = disputeService.getAssembledCase(disputeId);
  if (!caseData) {
    return { dispute_id: disputeId, conflict_detected: false, has_conflicts: false, conflict_count: 0, conflicts: [] };
  }

  const { dispute, payment, order, evidence } = caseData;
  const canonicalReason = normalizeReasonCode(dispute.reason_code);
  const conflicts = [];

  // Conflict 1: Delivery Status Mismatch (Non-delivered order state)
  if (order && canonicalReason === 'product_not_received') {
    if (order.delivery_status && order.delivery_status !== 'delivered' && order.delivery_status !== 'DELIVERED') {
      conflicts.push({
        code: 'DELIVERY_STATUS_NOT_DELIVERED',
        title: 'Delivery Status Mismatch',
        severity: 'HIGH',
        description: `Order delivery status is marked '${order.delivery_status}' in fulfillment logs, contradicting customer claim of non-delivery.`
      });
    }
  }

  // Conflict 2: Delivery Marked Without OTP Verification
  const delivDoc = (evidence || []).find(e => e.type === 'delivery_confirmation');
  if (canonicalReason === 'product_not_received' && delivDoc) {
    const otpVerified = delivDoc.otp_verified ?? delivDoc.provenance?.otp_verified ?? true;
    if (otpVerified === false) {
      conflicts.push({
        code: 'DELIVERY_MARKED_WITHOUT_OTP',
        title: 'Delivery Marked Without OTP Verification',
        severity: 'HIGH',
        description: 'Courier marked shipment delivered, but OTP verification was bypassed or unverified, conflicting with non-receipt claim.'
      });
    }
  }

  // Conflict 3: Filing Lag vs Physical Transit Window
  if (dispute.created_at && payment && payment.created_at) {
    const dispTime = new Date(dispute.created_at).getTime();
    const payTime = new Date(payment.created_at).getTime();
    const lagHours = Math.max(0, (dispTime - payTime) / (1000 * 3600));

    if (lagHours < 4.0 && (canonicalReason === 'product_not_received' || canonicalReason === 'product_defective')) {
      conflicts.push({
        code: 'IMPOSSIBLE_TRANSIT_LAG',
        title: 'Filing Latency Anomaly',
        severity: 'MEDIUM',
        description: `Dispute filed ${lagHours.toFixed(1)} hours after payment creation. Courier transit window physically requires 24–72 hours.`
      });
    }
  }

  // Conflict 4: Missing Critical Proof Document
  const presentTypes = new Set((evidence || []).filter(e => e.present && e.doc_id).map(e => e.type));
  if (canonicalReason === 'product_not_received' && !presentTypes.has('delivery_confirmation')) {
    conflicts.push({
      code: 'MISSING_DELIVERY_PROOF',
      title: 'Missing Courier Proof of Delivery',
      severity: 'HIGH',
      description: 'Courier delivery confirmation document ID is absent from present evidence dossiers.'
    });
  }

  return {
    dispute_id: disputeId,
    conflict_detected: conflicts.length > 0,
    has_conflicts: conflicts.length > 0,
    conflict_count: conflicts.length,
    conflicts: conflicts
  };
}

module.exports = {
  detectConflicts
};

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

/**
 * Mapping of dispute reason_code to required evidentiary document types
 * Based on Razorpay public chargeback & dispute documentation.
 */
const REQUIRED_EVIDENCE_MAP = {
  product_not_received: [
    'delivery_confirmation',
    'shipping_record',
    'customer_communication'
  ],
  fraudulent_transaction: [
    'payment_confirmation',
    'terms_acceptance',
    'customer_communication'
  ],
  duplicate_charge: [
    'payment_confirmation',
    'customer_communication'
  ],
  product_defective: [
    'customer_communication',
    'terms_acceptance',
    'delivery_confirmation'
  ],
  service_not_rendered: [
    'customer_communication',
    'terms_acceptance'
  ],
  credit_not_processed: [
    'customer_communication',
    'payment_confirmation'
  ]
};

/**
 * Calculates evidence strength score (0 to 100) deterministically
 * based on dispute reason_code and present evidence documents.
 */
function evaluateEvidenceScore(disputeId) {
  const disputeDataRepository = require('./disputeDataRepository');
  const caseData = disputeDataRepository.getAssembledCase(disputeId);
  if (!caseData || !caseData.dispute) {
    throw new Error(`Dispute not found: ${disputeId}`);
  }

  const dispute = caseData.dispute;
  const docs = caseData.evidence || [];
  const requiredTypes = REQUIRED_EVIDENCE_MAP[dispute.reason_code] || ['payment_confirmation', 'customer_communication'];

  // Count present required evidence types
  let presentRequiredCount = 0;
  for (const reqType of requiredTypes) {
    const doc = docs.find(d => d.type === reqType);
    if (doc && doc.present === true && doc.doc_id !== null) {
      presentRequiredCount++;
    }
  }

  // Count any additional present evidence documents
  let extraPresentCount = 0;
  for (const doc of docs) {
    if (!requiredTypes.includes(doc.type) && doc.present === true && doc.doc_id !== null) {
      extraPresentCount++;
    }
  }

  const baseScore = (presentRequiredCount / requiredTypes.length) * 90;
  const bonus = Math.min(10, extraPresentCount * 5);
  const totalScore = Math.min(100, Math.max(0, baseScore + bonus));

  return parseFloat(totalScore.toFixed(1));
}

module.exports = {
  REQUIRED_EVIDENCE_MAP,
  evaluateEvidenceScore
};

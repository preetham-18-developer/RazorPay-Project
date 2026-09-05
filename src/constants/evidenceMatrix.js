/**
 * Evidence Requirement Matrix for DisputeShield
 * Maps Razorpay dispute reason codes to required vs optional evidence categories.
 * Decouples claim category expectations from raw evidence document scores.
 */

const EVIDENCE_MATRIX = {
  product_not_received: {
    title: 'Product Not Received',
    required_types: ['payment_confirmation', 'delivery_confirmation'],
    optional_types: ['shipping_record', 'customer_communication'],
    critical_doc: 'delivery_confirmation',
    description: 'Requires proof of payment authorization and courier delivery confirmation to recipient address.'
  },
  product_defective: {
    title: 'Product Defective / Not as Described',
    required_types: ['payment_confirmation', 'terms_acceptance'],
    optional_types: ['customer_communication', 'delivery_confirmation'],
    critical_doc: 'terms_acceptance',
    description: 'Requires proof of terms acceptance (merchant return policy) and customer support ticket history.'
  },
  fraudulent_transaction: {
    title: 'Unauthorized / Fraudulent Transaction',
    required_types: ['payment_confirmation', 'terms_acceptance'],
    optional_types: ['customer_communication', 'delivery_confirmation'],
    critical_doc: 'payment_confirmation',
    description: 'Requires verified 2FA payment authorization, device telemetry, and customer authentication logs.'
  },
  duplicate_charge: {
    title: 'Duplicate Charge Claim',
    required_types: ['payment_confirmation'],
    optional_types: ['customer_communication'],
    critical_doc: 'payment_confirmation',
    description: 'Requires unique session checkout logs and payment transaction authorization records.'
  },
  service_not_rendered: {
    title: 'Service Not Rendered',
    required_types: ['payment_confirmation', 'terms_acceptance'],
    optional_types: ['customer_communication'],
    critical_doc: 'terms_acceptance',
    description: 'Requires digital service agreement logs and terms of service acceptance records.'
  },
  credit_not_processed: {
    title: 'Credit / Refund Not Processed',
    required_types: ['payment_confirmation'],
    optional_types: ['customer_communication'],
    critical_doc: 'customer_communication',
    description: 'Requires payment ledger verification and customer communication inquiry logs.'
  }
};

/**
 * Normalizes external/varied reason code representations into canonical lower-case keys.
 */
function normalizeReasonCode(reasonCode) {
  if (!reasonCode) return 'product_not_received';
  const clean = String(reasonCode).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

  if (clean.includes('not_received') || clean.includes('non_receipt')) {
    return 'product_not_received';
  }
  if (clean.includes('defective') || clean.includes('wrong_product') || clean.includes('missing_item') || clean.includes('not_as_described')) {
    return 'product_defective';
  }
  if (clean.includes('fraud') || clean.includes('unauthorized')) {
    return 'fraudulent_transaction';
  }
  if (clean.includes('duplicate') || clean.includes('double_charge')) {
    return 'duplicate_charge';
  }
  if (clean.includes('service')) {
    return 'service_not_rendered';
  }
  if (clean.includes('refund') || clean.includes('credit')) {
    return 'credit_not_processed';
  }

  return clean in EVIDENCE_MATRIX ? clean : 'product_not_received';
}

function getRequirementsForReason(reasonCode) {
  const canonicalReason = normalizeReasonCode(reasonCode);
  return EVIDENCE_MATRIX[canonicalReason] || EVIDENCE_MATRIX.product_not_received;
}

module.exports = {
  EVIDENCE_MATRIX,
  normalizeReasonCode,
  getRequirementsForReason
};

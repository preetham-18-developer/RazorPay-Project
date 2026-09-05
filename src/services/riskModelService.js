const fs = require('fs');
const path = require('path');
const { normalizeReasonCode } = require('../constants/evidenceMatrix');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const MODEL_V2_PATH = path.join(DATA_DIR, 'risk-model.json');
const MODEL_V3_PATH = path.join(DATA_DIR, 'risk-model-v3.json');

const REASON_RISK_INDEX = {
  fraudulent_transaction: 1.0,
  service_not_rendered: 0.6,
  product_not_received: 0.4,
  duplicate_charge: 0.3,
  product_defective: 0.2,
  credit_not_processed: 0.1
};

const METHOD_RISK_INDEX = {
  card: 0.6,
  upi: 0.3,
  netbanking: 0.2
};

function sigmoid(z) {
  return 1 / (1 + Math.exp(-Math.max(-50, Math.min(50, z))));
}

function loadModel(version = 'v3') {
  const modelPath = (version === 'v2') ? MODEL_V2_PATH : MODEL_V3_PATH;
  if (!fs.existsSync(modelPath)) {
    if (fs.existsSync(MODEL_V2_PATH)) {
      return { model: JSON.parse(fs.readFileSync(MODEL_V2_PATH, 'utf8')), version: 'v2' };
    }
    throw new Error(`Risk model artifact not found at ${modelPath}`);
  }
  return { model: JSON.parse(fs.readFileSync(modelPath, 'utf8')), version: version };
}

/**
 * Predicts operational risk score for a given dispute_id.
 * Ground truth is NEVER accessed or exposed.
 * Uses 24-hour velocity window and population means for unobserved telemetry.
 */
function predictRiskScore(disputeId, requestedVersion = 'v3') {
  const { model, version } = loadModel(requestedVersion);

  const disputeDataRepository = require('./disputeDataRepository');
  const caseData = disputeDataRepository.getAssembledCase(disputeId);
  if (!caseData || !caseData.dispute) {
    throw new Error(`Dispute not found: ${disputeId}`);
  }

  const dispute = caseData.dispute;
  const payment = caseData.payment;
  const custId = payment ? (payment.customer_id || payment.user_id) : 'cust_000';
  
  let payments = [];
  const paymentsPath = path.join(DATA_DIR, 'payments.json');
  if (fs.existsSync(paymentsPath)) {
    try { payments = JSON.parse(fs.readFileSync(paymentsPath, 'utf8')); } catch (e) {}
  }
  const allCustomerPayments = payments.filter(p => p.customer_id === custId);

  // 24-hour transaction velocity window calculation
  const refTime = payment && payment.created_at ? new Date(payment.created_at).getTime() : Date.now();
  const recentPayments = allCustomerPayments.filter(p => {
    if (!p.created_at) return true;
    const t = new Date(p.created_at).getTime();
    return Math.abs(refTime - t) <= 24 * 3600 * 1000;
  });
  const velocityScore = Math.max(1, recentPayments.length);

  const canonicalReason = normalizeReasonCode(dispute.reason_code);
  const reasonRiskVal = REASON_RISK_INDEX[canonicalReason] || 0.4;
  const methodRiskVal = METHOD_RISK_INDEX[payment ? (payment.method || '').toLowerCase() : 'card'] || 0.3;

  let rawFeatures = [];

  if (version === 'v2') {
    const customerDevices = new Set(allCustomerPayments.map(p => p.device_id));
    const customerIPs = new Set(allCustomerPayments.map(p => p.ip_address));

    let merchantTotal = 0;
    for (const p of payments) merchantTotal += p.amount;
    const merchantAvg = merchantTotal / (payments.length || 1);
    let merchantVar = 0;
    for (const p of payments) merchantVar += Math.pow(p.amount - merchantAvg, 2);
    const merchantStd = Math.sqrt(merchantVar / (payments.length || 1)) || 1;

    const custAvg = allCustomerPayments.length > 0
      ? allCustomerPayments.reduce((a, b) => a + b.amount, 0) / allCustomerPayments.length
      : dispute.amount;

    rawFeatures = [
      velocityScore,
      Math.abs(dispute.amount - custAvg) / 100000,
      (dispute.amount - merchantAvg) / merchantStd,
      customerDevices.size > 1 ? 1.0 : 0.0,
      customerIPs.size > 1 ? 1.0 : 0.0,
      reasonRiskVal
    ];
  } else {
    // Enhanced v3 10-feature vector
    const custAmounts = allCustomerPayments.map(p => p.amount);
    const custAvg = custAmounts.length > 0 ? custAmounts.reduce((a, b) => a + b, 0) / custAmounts.length : dispute.amount;
    const custMax = custAmounts.length > 0 ? Math.max(...custAmounts) : dispute.amount;
    const custDevices = new Set(allCustomerPayments.map(p => p.device_id).filter(Boolean));
    const custIPs = new Set(allCustomerPayments.map(p => p.ip_address).filter(Boolean));

    let disputeLagHours = 48.0;
    if (dispute.created_at && payment && payment.created_at) {
      const dispTime = new Date(dispute.created_at).getTime();
      const payTime = new Date(payment.created_at).getTime();
      disputeLagHours = Math.max(0, (dispTime - payTime) / (1000 * 3600));
    }

    const isSingleTxnOrUnseen = allCustomerPayments.length <= 1;
    const deviceMismatchVal = isSingleTxnOrUnseen
      ? (model.feature_means[3] || 0.922)
      : (custDevices.size > 1 ? 1.0 : 0.0);
    const ipMismatchVal = isSingleTxnOrUnseen
      ? (model.feature_means[4] || 0.922)
      : (custIPs.size > 1 ? 1.0 : 0.0);

    rawFeatures = [
      velocityScore, // velocity_score (24-hour window)
      Math.abs(dispute.amount - custAvg) / 100000, // customer_amount_dev
      (dispute.amount - 249900) / 500000, // merchant_amount_dev
      deviceMismatchVal, // device_mismatch
      ipMismatchVal, // ip_mismatch
      reasonRiskVal, // reason_code_risk
      velocityScore, // customer_txn_count (24-hour window)
      custMax > 0 ? dispute.amount / custMax : 1.0, // amount_ratio_to_cust_max
      disputeLagHours, // dispute_lag_hours
      methodRiskVal // payment_method_risk
    ];
  }

  // Standardize features using model means and stds
  let z = model.intercept;
  for (let i = 0; i < rawFeatures.length; i++) {
    const mean = model.feature_means[i] || 0;
    const std = model.feature_stds[i] || 1.0;
    const normVal = (rawFeatures[i] - mean) / std;
    z += model.weights[i] * normVal;
  }

  const prob = sigmoid(z);
  const riskScore = parseFloat((prob * 100).toFixed(1));

  return {
    risk_score: riskScore,
    risk_model_version: version
  };
}

module.exports = {
  predictRiskScore
};

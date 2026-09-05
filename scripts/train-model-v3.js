const fs = require('fs');
const path = require('path');

const SEED = 20260822;

function createPRNG(seed) {
  let s = seed >>> 0;
  return function () {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const prng = createPRNG(SEED);

const DATA_DIR = path.join(__dirname, '..', 'data');
const SPLIT_PATH = path.join(DATA_DIR, 'train-test-split.json');

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

function extractPhase3Features(dispute, payment, customerPayments) {
  const custAmounts = customerPayments.map(p => p.amount);
  const custAvg = custAmounts.length > 0 ? custAmounts.reduce((a, b) => a + b, 0) / custAmounts.length : dispute.amount;
  const custMax = custAmounts.length > 0 ? Math.max(...custAmounts) : dispute.amount;

  const custDevices = new Set(customerPayments.map(p => p.device_id));
  const custIPs = new Set(customerPayments.map(p => p.ip_address));

  // 1. Velocity score (count of transactions)
  const velocityScore = customerPayments.length;

  // 2. Customer amount deviation
  const custAmountDev = Math.abs(dispute.amount - custAvg) / 100000;

  // 3. Merchant amount deviation (scaled)
  const merchantAmountDev = (dispute.amount - 249900) / 500000;

  // 4. Device mismatch flag
  const deviceMismatch = custDevices.size > 1 ? 1.0 : 0.0;

  // 5. IP mismatch flag
  const ipMismatch = custIPs.size > 1 ? 1.0 : 0.0;

  // 6. Reason code risk index
  const reasonCodeRisk = REASON_RISK_INDEX[dispute.reason_code] || 0.3;

  // --- ENGINEERED PHASE 3 FEATURES ---

  // 7. Customer transaction count (account historical depth)
  const customerTxnCount = customerPayments.length;

  // 8. Ratio of dispute amount to customer historical maximum transaction
  const amountRatioToCustMax = custMax > 0 ? dispute.amount / custMax : 1.0;

  // 9. Dispute creation lag in hours (dispute created_at vs payment created_at)
  let disputeLagHours = 48.0;
  if (dispute.created_at && payment && payment.created_at) {
    const dispTime = new Date(dispute.created_at).getTime();
    const payTime = new Date(payment.created_at).getTime();
    disputeLagHours = Math.max(0, (dispTime - payTime) / (1000 * 3600));
  }

  // 10. Payment method risk index
  const paymentMethodRisk = METHOD_RISK_INDEX[payment ? payment.method : 'card'] || 0.3;

  return [
    velocityScore,
    custAmountDev,
    merchantAmountDev,
    deviceMismatch,
    ipMismatch,
    reasonCodeRisk,
    customerTxnCount,
    amountRatioToCustMax,
    disputeLagHours,
    paymentMethodRisk
  ];
}

function sigmoid(z) {
  return 1 / (1 + Math.exp(-Math.max(-50, Math.min(50, z))));
}

function trainRegularizedLogisticRegression(X, y, epochs = 3000, lr = 0.05, lambdaL2 = 0.1) {
  const numFeatures = X[0].length;
  let weights = new Array(numFeatures).fill(0.0);
  let intercept = 0.0;
  const N = X.length;

  for (let epoch = 0; epoch < epochs; epoch++) {
    let dw = new Array(numFeatures).fill(0.0);
    let db = 0.0;

    for (let i = 0; i < N; i++) {
      let z = intercept;
      for (let j = 0; j < numFeatures; j++) {
        z += weights[j] * X[i][j];
      }
      const yHat = sigmoid(z);
      const err = yHat - y[i];

      for (let j = 0; j < numFeatures; j++) {
        dw[j] += err * X[i][j];
      }
      db += err;
    }

    for (let j = 0; j < numFeatures; j++) {
      // Add L2 penalty derivative (lambda * weight)
      const reg = lambdaL2 * weights[j];
      weights[j] -= (lr * (dw[j] + reg)) / N;
    }
    intercept -= (lr * db) / N;
  }

  return { weights, intercept };
}

function main() {
  console.log('[Train-v3] Starting Phase 3 Versioned Model Training...');

  const payments = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'payments.json'), 'utf8'));
  const disputes = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'disputes.json'), 'utf8'));
  const groundTruth = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'ground-truth.json'), 'utf8'));
  const split = JSON.parse(fs.readFileSync(SPLIT_PATH, 'utf8'));

  const trainIds = split.train; // 77 training cases
  console.log(`[Train-v3] Training set size: ${trainIds.length} disputes (Original 33 test holdout remains UNTOUCHED)`);

  const trainX_raw = [];
  const trainY = [];

  for (const dispId of trainIds) {
    const dispute = disputes.find(d => d.id === dispId);
    const payment = payments.find(p => p.id === dispute.payment_id);
    const custId = payment ? payment.customer_id : 'cust_000';
    const customerPayments = payments.filter(p => p.customer_id === custId);

    const featVec = extractPhase3Features(dispute, payment, customerPayments);
    const gt = groundTruth[dispId];
    const label = (gt === 'genuine_fraud') ? 1.0 : 0.0;

    trainX_raw.push(featVec);
    trainY.push(label);
  }

  // Compute feature means & stds on training set only
  const numFeatures = trainX_raw[0].length;
  const featureMeans = new Array(numFeatures).fill(0);
  const featureStds = new Array(numFeatures).fill(0);

  for (let j = 0; j < numFeatures; j++) {
    let sum = 0;
    for (let i = 0; i < trainX_raw.length; i++) {
      sum += trainX_raw[i][j];
    }
    featureMeans[j] = sum / trainX_raw.length;

    let varSum = 0;
    for (let i = 0; i < trainX_raw.length; i++) {
      varSum += Math.pow(trainX_raw[i][j] - featureMeans[j], 2);
    }
    featureStds[j] = Math.sqrt(varSum / trainX_raw.length) || 1.0;
  }

  // Z-score normalization
  const trainX_norm = trainX_raw.map(row =>
    row.map((val, j) => (val - featureMeans[j]) / featureStds[j])
  );

  const lambdaL2 = 0.15;
  const { weights, intercept } = trainRegularizedLogisticRegression(trainX_norm, trainY, 4000, 0.08, lambdaL2);

  const featureNames = [
    'velocity_score',
    'customer_amount_dev',
    'merchant_amount_dev',
    'device_mismatch',
    'ip_mismatch',
    'reason_code_risk',
    'customer_txn_count',
    'amount_ratio_to_cust_max',
    'dispute_lag_hours',
    'payment_method_risk'
  ];

  const v3Artifact = {
    model_version: 'v3',
    model_type: 'regularized_logistic_regression',
    feature_names: featureNames,
    weights: weights,
    intercept: intercept,
    feature_means: featureMeans,
    feature_stds: featureStds,
    lambda_l2: lambdaL2,
    trained_at: new Date().toISOString()
  };

  fs.writeFileSync(path.join(DATA_DIR, 'risk-model-v3.json'), JSON.stringify(v3Artifact, null, 2));
  console.log('[Train-v3] Phase 3 model successfully trained and saved to data/risk-model-v3.json!');
}

main();

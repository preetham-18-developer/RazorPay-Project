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

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const DATA_DIR = path.join(__dirname, '..', 'data');

function loadData() {
  const payments = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'payments.json'), 'utf8'));
  const orders = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'orders.json'), 'utf8'));
  const disputes = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'disputes.json'), 'utf8'));
  const groundTruth = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'ground-truth.json'), 'utf8'));
  return { payments, orders, disputes, groundTruth };
}

const REASON_RISK_INDEX = {
  fraudulent_transaction: 1.0,
  service_not_rendered: 0.6,
  product_not_received: 0.4,
  duplicate_charge: 0.3,
  product_defective: 0.2,
  credit_not_processed: 0.1
};

function extractFeatures(disputes, payments) {
  // Pre-calculate customer stats & merchant stats
  const customerPaymentsMap = {};
  const customerDevicesMap = {};
  const customerIPsMap = {};
  let merchantTotalAmount = 0;

  for (const p of payments) {
    merchantTotalAmount += p.amount;
    if (!customerPaymentsMap[p.customer_id]) {
      customerPaymentsMap[p.customer_id] = [];
      customerDevicesMap[p.customer_id] = new Set();
      customerIPsMap[p.customer_id] = new Set();
    }
    customerPaymentsMap[p.customer_id].push(p.amount);
    customerDevicesMap[p.customer_id].add(p.device_id);
    customerIPsMap[p.customer_id].add(p.ip_address);
  }

  const merchantAvgAmount = merchantTotalAmount / payments.length;
  let merchantVariance = 0;
  for (const p of payments) {
    merchantVariance += Math.pow(p.amount - merchantAvgAmount, 2);
  }
  const merchantStdDev = Math.sqrt(merchantVariance / payments.length) || 1;

  const featureVectors = [];

  for (const disp of disputes) {
    const payment = payments.find(p => p.id === disp.payment_id);
    const custId = payment ? payment.customer_id : 'cust_000';
    const custAmounts = customerPaymentsMap[custId] || [disp.amount];
    const custAvg = custAmounts.reduce((a, b) => a + b, 0) / custAmounts.length;

    // Feature 1: Customer transaction velocity count
    const velocityScore = custAmounts.length;

    // Feature 2: Amount deviation from customer mean
    const custAmountDev = Math.abs(disp.amount - custAvg) / 100000;

    // Feature 3: Amount deviation from merchant mean
    const merchantAmountDev = (disp.amount - merchantAvgAmount) / merchantStdDev;

    // Feature 4: Device mismatch / multiple devices count
    const devCount = customerDevicesMap[custId] ? customerDevicesMap[custId].size : 1;
    const deviceMismatch = devCount > 1 ? 1.0 : 0.0;

    // Feature 5: IP mismatch / multiple IPs count
    const ipCount = customerIPsMap[custId] ? customerIPsMap[custId].size : 1;
    const ipMismatch = ipCount > 1 ? 1.0 : 0.0;

    // Feature 6: Reason code risk weight
    const reasonCodeRisk = REASON_RISK_INDEX[disp.reason_code] || 0.3;

    featureVectors.push({
      dispute_id: disp.id,
      features: [velocityScore, custAmountDev, merchantAmountDev, deviceMismatch, ipMismatch, reasonCodeRisk]
    });
  }

  return { featureVectors };
}

function sigmoid(z) {
  return 1 / (1 + Math.exp(-Math.max(-50, Math.min(50, z))));
}

function trainLogisticRegression(X, y, epochs = 2000, lr = 0.05) {
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
      weights[j] -= (lr * dw[j]) / N;
    }
    intercept -= (lr * db) / N;
  }

  return { weights, intercept };
}

function main() {
  console.log('[Train] Starting Logistic Regression model training...');
  const { payments, disputes, groundTruth } = loadData();

  // Deterministic Train/Test Split (70% train = 77, 30% test = 33)
  const allDisputeIds = disputes.map(d => d.id);
  const shuffledIds = shuffle(allDisputeIds);
  const trainCount = Math.floor(shuffledIds.length * 0.7); // 77

  const trainIds = shuffledIds.slice(0, trainCount);
  const testIds = shuffledIds.slice(trainCount);

  const splitData = {
    seed: SEED,
    total: allDisputeIds.length,
    train_count: trainIds.length,
    test_count: testIds.length,
    train: trainIds,
    test: testIds
  };

  fs.writeFileSync(path.join(DATA_DIR, 'train-test-split.json'), JSON.stringify(splitData, null, 2));
  console.log(`[Train] Split generated: ${trainIds.length} train, ${testIds.length} test (Saved to data/train-test-split.json)`);

  const { featureVectors } = extractFeatures(disputes, payments);
  const featureMap = {};
  featureVectors.forEach(fv => featureMap[fv.dispute_id] = fv.features);

  // Prepare training data matrix X and labels y
  const trainX_raw = [];
  const trainY = [];

  for (const id of trainIds) {
    const feat = featureMap[id];
    const gt = groundTruth[id];
    // Label 1.0 for genuine_fraud, 0.0 for legitimate_dispute & friendly_fraud
    const label = (gt === 'genuine_fraud') ? 1.0 : 0.0;
    trainX_raw.push(feat);
    trainY.push(label);
  }

  // Calculate feature means & stds for Z-score normalization
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

  // Normalize training matrix
  const trainX_norm = trainX_raw.map(row =>
    row.map((val, j) => (val - featureMeans[j]) / featureStds[j])
  );

  const { weights, intercept } = trainLogisticRegression(trainX_norm, trainY, 3000, 0.1);

  const modelArtifact = {
    model_type: 'logistic_regression',
    feature_names: [
      'velocity_score',
      'customer_amount_dev',
      'merchant_amount_dev',
      'device_mismatch',
      'ip_mismatch',
      'reason_code_risk'
    ],
    weights: weights,
    intercept: intercept,
    feature_means: featureMeans,
    feature_stds: featureStds,
    trained_at: new Date().toISOString()
  };

  fs.writeFileSync(path.join(DATA_DIR, 'risk-model.json'), JSON.stringify(modelArtifact, null, 2));
  console.log('[Train] Logistic Regression model trained and saved to data/risk-model.json successfully!');
}

main();

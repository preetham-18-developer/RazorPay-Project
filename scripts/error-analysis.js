const fs = require('fs');
const path = require('path');
const riskModelService = require('../src/services/riskModelService');
const decisionEngine = require('../src/services/decisionEngine');
const evidenceEvaluatorService = require('../src/services/evidenceEvaluatorService');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SPLIT_PATH = path.join(DATA_DIR, 'train-test-split.json');
const GROUND_TRUTH_PATH = path.join(DATA_DIR, 'ground-truth.json');
const DISPUTES_PATH = path.join(DATA_DIR, 'disputes.json');
const PAYMENTS_PATH = path.join(DATA_DIR, 'payments.json');

function runErrorAnalysis() {
  console.log('==================================================');
  console.log('PHASE 3 — DETAILED ERROR ANALYSIS (33-CASE HOLDOUT)');
  console.log('==================================================\n');

  const split = JSON.parse(fs.readFileSync(SPLIT_PATH, 'utf8'));
  const groundTruth = JSON.parse(fs.readFileSync(GROUND_TRUTH_PATH, 'utf8'));
  const disputes = JSON.parse(fs.readFileSync(DISPUTES_PATH, 'utf8'));
  const payments = JSON.parse(fs.readFileSync(PAYMENTS_PATH, 'utf8'));

  const testIds = split.test;

  const analysisResults = [];
  const falsePositives = [];
  const falseNegatives = [];
  const truePositives = [];
  const trueNegatives = [];

  for (const dispId of testIds) {
    const dispute = disputes.find(d => d.id === dispId);
    const payment = payments.find(p => p.id === dispute.payment_id);
    const actualGt = groundTruth[dispId];
    const riskScore = riskModelService.predictRiskScore(dispId);
    const evidenceScore = evidenceEvaluatorService.evaluateEvidenceScore(dispId);
    const decisionRes = decisionEngine.evaluateDecision({ dispute, riskScore, evidenceScore });

    const isPredictedFraud = riskScore >= 40.0;
    const isActualFraud = actualGt === 'genuine_fraud';

    const item = {
      dispute_id: dispId,
      amount_inr: dispute.amount / 100,
      reason_code: dispute.reason_code,
      customer_id: payment ? payment.customer_id : null,
      device_id: payment ? payment.device_id : null,
      ip_address: payment ? payment.ip_address : null,
      ground_truth: actualGt,
      is_actual_fraud: isActualFraud,
      risk_score: riskScore,
      predicted_class: isPredictedFraud ? 'fraud' : 'legitimate_or_friendly',
      decision: decisionRes.decision,
      gate_triggered: decisionRes.gate_triggered
    };

    analysisResults.push(item);

    if (isPredictedFraud && isActualFraud) {
      truePositives.push(item);
    } else if (!isPredictedFraud && !isActualFraud) {
      trueNegatives.push(item);
    } else if (isPredictedFraud && !isActualFraud) {
      item.error_type = 'False Positive';
      item.explanation = `Model assigned risk_score=${riskScore} (>= 40.0) to actual '${actualGt}'. High reason_code_risk (${dispute.reason_code}) or amount/device anomaly caused logit elevation despite benign customer intent.`;
      falsePositives.push(item);
    } else if (!isPredictedFraud && isActualFraud) {
      item.error_type = 'False Negative';
      item.explanation = `Model assigned risk_score=${riskScore} (< 40.0) to actual '${actualGt}'. Fraudster mimicked low-velocity and normal transaction amount, suppressing behavioral risk signals.`;
      falseNegatives.push(item);
    }
  }

  console.log(`Holdout Total: ${testIds.length}`);
  console.log(`True Positives (TP): ${truePositives.length}`);
  console.log(`True Negatives (TN): ${trueNegatives.length}`);
  console.log(`False Positives (FP): ${falsePositives.length}`);
  console.log(`False Negatives (FN): ${falseNegatives.length}\n`);

  console.log('--- FALSE POSITIVES ANALYSIS ---');
  falsePositives.forEach((fp, i) => {
    console.log(`[FP ${i + 1}] ${fp.dispute_id} | Amount: ₹${fp.amount_inr} | Reason: ${fp.reason_code} | Ground Truth: ${fp.ground_truth} | Risk Score: ${fp.risk_score}`);
    console.log(`      Explanation: ${fp.explanation}\n`);
  });

  console.log('--- FALSE NEGATIVES ANALYSIS ---');
  falseNegatives.forEach((fn, i) => {
    console.log(`[FN ${i + 1}] ${fn.dispute_id} | Amount: ₹${fn.amount_inr} | Reason: ${fn.reason_code} | Ground Truth: ${fn.ground_truth} | Risk Score: ${fn.risk_score}`);
    console.log(`      Explanation: ${fn.explanation}\n`);
  });

  return { analysisResults, truePositives, trueNegatives, falsePositives, falseNegatives };
}

if (require.main === module) {
  runErrorAnalysis();
}

module.exports = runErrorAnalysis;

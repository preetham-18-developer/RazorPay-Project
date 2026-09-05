const RUPEE_THRESHOLD = parseInt(process.env.RUPEE_THRESHOLD || '5000', 10);

/**
 * Evaluates operational risk score & evidence score to form a dispute defense recommendation.
 * Applies deterministic safety gate for high-value disputes (>₹5,000).
 */
function evaluateDecision({ dispute, riskScore, evidenceScore }) {
  const isLowRisk = riskScore < 40.0;
  const isHighRisk = riskScore >= 40.0;
  const isHighEvidence = evidenceScore >= 60.0;
  const isLowEvidence = evidenceScore < 40.0;

  let initialDecision = 'review';
  let reasoningSummary = '';

  if (isLowRisk && isHighEvidence) {
    initialDecision = 'auto_draft';
    reasoningSummary = `Low risk (${riskScore}) with high evidence strength (${evidenceScore}). Qualified for automated defense drafting.`;
  } else if (isHighRisk && isHighEvidence) {
    initialDecision = 'prepare_and_review';
    reasoningSummary = `High risk (${riskScore}) combined with high evidence strength (${evidenceScore}). Prepare defense draft for human risk officer review.`;
  } else if (isLowEvidence) {
    initialDecision = 'do_not_contest_review';
    reasoningSummary = `Low evidence strength (${evidenceScore}). Recommended to review before contesting due to high loss probability.`;
  } else {
    initialDecision = 'review';
    reasoningSummary = `Ambiguous risk/evidence signals (Risk: ${riskScore}, Evidence: ${evidenceScore}). Manual review required.`;
  }

  // Calculate confidence score (0-100)
  const confidence = parseFloat(
    Math.min(98.0, Math.max(50.0, 50 + Math.abs(evidenceScore - 50) * 0.5 + Math.abs(50 - riskScore) * 0.4)).toFixed(1)
  );

  const reasoningTrail = [
    `Risk Score: ${riskScore} (${isLowRisk ? 'Low Risk < 40' : 'High Risk >= 40'})`,
    `Evidence Strength Score: ${evidenceScore} (${isHighEvidence ? 'High Evidence >= 60' : (isLowEvidence ? 'Low Evidence < 40' : 'Moderate Evidence')})`,
    `Initial Decision Engine Output: ${initialDecision}`
  ];

  // Deterministic Safety Gate Check
  // dispute.amount is in paise (1 INR = 100 paise)
  const amountRupees = (dispute ? dispute.amount : 0) / 100;
  let finalDecision = initialDecision;
  let gateTriggered = false;

  if (amountRupees > RUPEE_THRESHOLD) {
    gateTriggered = true;
    if (initialDecision === 'auto_draft') {
      finalDecision = 'prepare_and_review';
      reasoningSummary += ` [SAFETY GATE TRIGGERED: Transaction amount ₹${amountRupees.toLocaleString('en-IN')} exceeds safety threshold ₹${RUPEE_THRESHOLD.toLocaleString('en-IN')}. Overridden to prepare_and_review.]`;
    }
    reasoningTrail.push(
      `Safety Gate Evaluation: Dispute amount ₹${amountRupees.toLocaleString('en-IN')} > ₹${RUPEE_THRESHOLD.toLocaleString('en-IN')} threshold. High-value policy active; human review enforced.`
    );
  } else {
    reasoningTrail.push(
      `Safety Gate Evaluation: Dispute amount ₹${amountRupees.toLocaleString('en-IN')} <= ₹${RUPEE_THRESHOLD.toLocaleString('en-IN')} threshold. Safety gate passed.`
    );
  }

  return {
    risk_score: riskScore,
    evidence_score: evidenceScore,
    decision: finalDecision,
    confidence: confidence,
    reasoning_summary: reasoningSummary,
    gate_triggered: gateTriggered,
    reasoning_trail: reasoningTrail
  };
}

module.exports = {
  RUPEE_THRESHOLD,
  evaluateDecision
};

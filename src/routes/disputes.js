const express = require('express');
const router = express.Router();
const disputeService = require('../services/disputeService');
const agentService = require('../services/agentService');
const draftService = require('../services/defenseDraftService');
const reviewService = require('../services/reviewService');
const riskModelService = require('../services/riskModelService');
const evidenceEvaluatorService = require('../services/evidenceEvaluatorService');
const decisionEngine = require('../services/decisionEngine');
const evidenceSufficiencyService = require('../services/evidenceSufficiencyService');
const conflictDetectorService = require('../services/conflictDetectorService');
const claimGroundingService = require('../services/claimGroundingService');

/**
 * GET /disputes
 * Retrieves array of dispute summaries.
 */
router.get('/', (req, res) => {
  try {
    const list = disputeService.getAllDisputes();
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve disputes', details: error.message });
  }
});

/**
 * GET /disputes/system/integration-status
 * Health check & configuration status endpoint.
 */
router.get('/system/integration-status', (req, res) => {
  try {
    const config = require('../config/razorpayConfig');
    res.status(200).json(config.getPublicSystemStatus());
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve system status', details: error.message });
  }
});

/**
 * GET /disputes/:id
 * Retrieves fully assembled case context for a specific dispute.
 */
router.get('/:id', (req, res, next) => {
  if (req.accepts('html') && !req.headers.accept?.includes('application/json')) {
    return next();
  }

  try {
    const disputeId = req.params.id;
    const assembledCase = disputeService.getAssembledCase(disputeId);

    if (!assembledCase) {
      return res.status(404).json({
        error: 'Dispute not found',
        dispute_id: disputeId
      });
    }

    res.status(200).json(assembledCase);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve dispute details', details: error.message });
  }
});

/**
 * POST /disputes/:id/analyze
 * Executes complete Phase 2/3 analysis pipeline:
 * Dispute -> Investigation Agent -> Risk Model (v3) -> Evidence Evaluator -> Sufficiency & Conflicts -> Decision Engine -> Safety Gate -> Final Result
 * Ground_truth excluded.
 */
router.post('/:id/analyze', async (req, res) => {
  const disputeId = req.params.id;
  const modelVersion = req.query.model_version || 'v3';

  try {
    const caseData = disputeService.getAssembledCase(disputeId);
    if (!caseData) {
      return res.status(404).json({
        error: 'Dispute not found',
        dispute_id: disputeId
      });
    }

    // 1. Run Investigation Agent
    const investigation = await agentService.runInvestigationAgent(disputeId);

    // 2. Risk Model Classifier (Returns { risk_score, risk_model_version })
    const riskRes = riskModelService.predictRiskScore(disputeId, modelVersion);

    // 3. Evidence Strength Evaluator (0-100)
    const evidenceScore = evidenceEvaluatorService.evaluateEvidenceScore(disputeId);

    // 4. Evidence Sufficiency & Gap Analysis
    const sufficiencyRes = evidenceSufficiencyService.evaluateEvidenceSufficiency(disputeId);

    // 5. Deterministic Conflict Detection
    const conflictRes = conflictDetectorService.detectConflicts(disputeId);

    // 6. Claim-Level Grounding Verification
    const groundingRes = claimGroundingService.evaluateClaimGrounding(disputeId);

    // 7. Decision Engine & Deterministic Safety Gate
    const decisionResult = decisionEngine.evaluateDecision({
      dispute: caseData.dispute,
      riskScore: riskRes.risk_score,
      evidenceScore: evidenceScore
    });

    const responsePayload = {
      dispute_id: disputeId,
      reason_code: caseData.dispute.reason_code,
      canonical_reason_code: sufficiencyRes.canonical_reason_code,
      investigation: investigation,
      risk_score: decisionResult.risk_score,
      risk_model_version: riskRes.risk_model_version,
      evidence_score: decisionResult.evidence_score,
      decision: decisionResult.decision,
      confidence: decisionResult.confidence,
      reasoning_summary: decisionResult.reasoning_summary,
      gate_triggered: decisionResult.gate_triggered,
      reasoning_trail: decisionResult.reasoning_trail,
      evidence_sufficiency: sufficiencyRes,
      conflicts: conflictRes,
      claim_grounding: groundingRes
    };

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error(`Error analyzing dispute ${disputeId}:`, error);
    return res.status(500).json({
      error: 'Failed to analyze dispute',
      dispute_id: disputeId,
      details: error.message
    });
  }
});

module.exports = router;

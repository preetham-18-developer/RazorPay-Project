const fs = require('fs');
const path = require('path');
const { REVIEW_STATES, DRAFT_ORIGIN } = require('../constants/reviewStates');
const defenseDraftService = require('./defenseDraftService');
const defenseValidatorService = require('./defenseValidatorService');
const disputeService = require('./disputeService');
const decisionEngine = require('./decisionEngine');
const riskModelService = require('./riskModelService');
const evidenceEvaluatorService = require('./evidenceEvaluatorService');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const LOGS_DIR = path.join(__dirname, '..', '..', 'logs');

const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const ACTIONS_FILE = path.join(DATA_DIR, 'action-records.json');
const AUDIT_LOG_FILE = path.join(LOGS_DIR, 'decision-audit.jsonl');

function ensureDataDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function loadJSONMap(filePath, defaultVal = {}) {
  ensureDataDirs();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2), 'utf8');
    return defaultVal;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return defaultVal;
  }
}

function saveJSONMap(filePath, data) {
  ensureDataDirs();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function logDecisionAudit({ disputeId, event, actor = 'system', decision = null, metadata = {} }) {
  try {
    ensureDataDirs();
    const logRecord = {
      timestamp: new Date().toISOString(),
      dispute_id: disputeId,
      event: event,
      actor: actor,
      decision: decision,
      metadata: metadata
    };
    fs.appendFileSync(AUDIT_LOG_FILE, JSON.stringify(logRecord) + '\n', 'utf8');
  } catch (err) {
    console.error('Failed to log decision audit:', err);
  }
}

/**
 * Returns current review state for disputeId from data/reviews.json
 */
function getReviewState(disputeId) {
  const reviews = loadJSONMap(REVIEWS_FILE, {});
  if (reviews[disputeId]) {
    return reviews[disputeId];
  }

  // Initialize review state from dispute analysis decision
  const caseData = disputeService.getAssembledCase(disputeId);
  if (!caseData) return null;

  const riskRes = riskModelService.predictRiskScore(disputeId);
  const evidenceScore = evidenceEvaluatorService.evaluateEvidenceScore(disputeId);
  const decisionRes = decisionEngine.evaluateDecision({
    dispute: caseData.dispute,
    riskScore: riskRes.risk_score,
    evidenceScore
  });

  const requiresHumanReview = decisionRes.decision !== 'auto_draft' || decisionRes.gate_triggered;

  const initialState = {
    dispute_id: disputeId,
    status: REVIEW_STATES.PENDING_REVIEW,
    decision: decisionRes.decision,
    requires_human_review: requiresHumanReview,
    draft_available: false,
    current_draft: null,
    reviewer: null,
    feedback: null,
    origin: null,
    updated_at: new Date().toISOString()
  };

  reviews[disputeId] = initialState;
  saveJSONMap(REVIEWS_FILE, reviews);
  logDecisionAudit({
    disputeId,
    event: 'review_started',
    actor: 'system',
    decision: decisionRes.decision,
    metadata: { requires_human_review: requiresHumanReview }
  });

  return initialState;
}

/**
 * Generates and validates defense draft, persisting to data/reviews.json
 */
function getOrGenerateDraft(disputeId) {
  const reviews = loadJSONMap(REVIEWS_FILE, {});
  let reviewState = reviews[disputeId] || getReviewState(disputeId);

  if (!reviewState) {
    throw new Error(`Dispute not found: ${disputeId}`);
  }

  if (reviewState.draft_available && reviewState.current_draft) {
    return reviewState.current_draft;
  }

  // Generate draft
  const draftObj = defenseDraftService.generateDefenseDraft(disputeId);
  const validation = defenseValidatorService.validateDefenseDraft(disputeId, draftObj);

  draftObj.validation = validation;
  draftObj.origin = DRAFT_ORIGIN.AI_GENERATED;

  reviewState.draft_available = true;
  reviewState.current_draft = draftObj;
  reviewState.origin = DRAFT_ORIGIN.AI_GENERATED;
  reviewState.updated_at = new Date().toISOString();

  reviews[disputeId] = reviewState;
  saveJSONMap(REVIEWS_FILE, reviews);

  logDecisionAudit({
    disputeId,
    event: 'draft_generated',
    actor: 'system',
    decision: reviewState.decision,
    metadata: { valid: validation.valid, errors_count: validation.errors.length }
  });

  logDecisionAudit({
    disputeId,
    event: 'draft_validation',
    actor: 'system',
    decision: reviewState.decision,
    metadata: { valid: validation.valid, warnings_count: validation.warnings.length }
  });

  return draftObj;
}

/**
 * Approves a defense draft with server-side validation and persists simulated action
 */
function approveReview(disputeId, { reviewer = 'demo-user', response_body }) {
  const reviews = loadJSONMap(REVIEWS_FILE, {});
  let reviewState = reviews[disputeId] || getReviewState(disputeId);

  if (!reviewState) {
    throw new Error(`Dispute not found: ${disputeId}`);
  }

  const existingDraft = reviewState.current_draft || defenseDraftService.generateDefenseDraft(disputeId);
  const finalResponseBody = response_body || existingDraft.response_body;

  // Determine origin (human_edited if text was modified)
  const normalizeText = str => (str || '').replace(/\r\n/g, '\n').trim();
  const isEdited = existingDraft.response_body && normalizeText(existingDraft.response_body) !== normalizeText(finalResponseBody);
  const origin = isEdited ? DRAFT_ORIGIN.HUMAN_EDITED : DRAFT_ORIGIN.AI_GENERATED;

  // Server-side validation check
  const validation = defenseValidatorService.validateDefenseDraft(disputeId, finalResponseBody);
  if (!validation.valid) {
    logDecisionAudit({
      disputeId,
      event: 'approval_failed_validation',
      actor: reviewer,
      decision: reviewState.decision,
      metadata: { errors: validation.errors }
    });
    throw new Error(`Draft approval failed server-side validation: ${validation.errors.join('; ')}`);
  }

  // Update review state
  reviewState.status = REVIEW_STATES.APPROVED;
  reviewState.reviewer = reviewer;
  reviewState.origin = origin;
  reviewState.updated_at = new Date().toISOString();
  if (reviewState.current_draft) {
    reviewState.current_draft.response_body = finalResponseBody;
    reviewState.current_draft.origin = origin;
  }

  reviews[disputeId] = reviewState;
  saveJSONMap(REVIEWS_FILE, reviews);

  // Record simulated action to data/action-records.json
  const rawActionRecords = loadJSONMap(ACTIONS_FILE, []);
  const actionRecords = Array.isArray(rawActionRecords) ? rawActionRecords : [];
  const actionEntry = {
    dispute_id: disputeId,
    action: 'defence_ready_for_submission',
    status: 'simulated',
    approved_by: reviewer,
    approved_at: new Date().toISOString(),
    response_body: finalResponseBody,
    origin: origin
  };
  actionRecords.push(actionEntry);
  saveJSONMap(ACTIONS_FILE, actionRecords);

  logDecisionAudit({
    disputeId,
    event: 'approved',
    actor: reviewer,
    decision: reviewState.decision,
    metadata: { origin, action_status: 'simulated' }
  });

  return {
    dispute_id: disputeId,
    status: REVIEW_STATES.APPROVED,
    approved_at: actionEntry.approved_at,
    reviewer: reviewer,
    origin: origin,
    action_record: actionEntry
  };
}

/**
 * Rejects a dispute review draft
 */
function rejectReview(disputeId, { reviewer = 'demo-user', reason = 'Insufficient evidence' }) {
  const reviews = loadJSONMap(REVIEWS_FILE, {});
  let reviewState = reviews[disputeId] || getReviewState(disputeId);

  if (!reviewState) {
    throw new Error(`Dispute not found: ${disputeId}`);
  }

  reviewState.status = REVIEW_STATES.REJECTED;
  reviewState.reviewer = reviewer;
  reviewState.feedback = reason;
  reviewState.updated_at = new Date().toISOString();

  reviews[disputeId] = reviewState;
  saveJSONMap(REVIEWS_FILE, reviews);

  logDecisionAudit({
    disputeId,
    event: 'rejected',
    actor: reviewer,
    decision: reviewState.decision,
    metadata: { reason }
  });

  return {
    dispute_id: disputeId,
    status: REVIEW_STATES.REJECTED,
    rejected_at: reviewState.updated_at,
    reviewer: reviewer,
    reason: reason
  };
}

/**
 * Requests changes on a dispute review draft
 */
function requestChangesReview(disputeId, { reviewer = 'demo-user', feedback = 'Please provide additional documentation.' }) {
  const reviews = loadJSONMap(REVIEWS_FILE, {});
  let reviewState = reviews[disputeId] || getReviewState(disputeId);

  if (!reviewState) {
    throw new Error(`Dispute not found: ${disputeId}`);
  }

  reviewState.status = REVIEW_STATES.CHANGES_REQUESTED;
  reviewState.reviewer = reviewer;
  reviewState.feedback = feedback;
  reviewState.updated_at = new Date().toISOString();

  reviews[disputeId] = reviewState;
  saveJSONMap(REVIEWS_FILE, reviews);

  logDecisionAudit({
    disputeId,
    event: 'changes_requested',
    actor: reviewer,
    decision: reviewState.decision,
    metadata: { feedback }
  });

  return {
    dispute_id: disputeId,
    status: REVIEW_STATES.CHANGES_REQUESTED,
    requested_at: reviewState.updated_at,
    reviewer: reviewer,
    feedback: feedback
  };
}

module.exports = {
  getReviewState,
  getOrGenerateDraft,
  approveReview,
  rejectReview,
  requestChangesReview
};

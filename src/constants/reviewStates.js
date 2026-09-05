/**
 * Review state constants for DisputeShield human review workflow
 */
const REVIEW_STATES = {
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CHANGES_REQUESTED: 'changes_requested'
};

const DRAFT_ORIGIN = {
  AI_GENERATED: 'ai_generated',
  HUMAN_EDITED: 'human_edited'
};

module.exports = {
  REVIEW_STATES,
  DRAFT_ORIGIN
};

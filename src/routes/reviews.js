const express = require('express');
const router = express.Router();
const reviewService = require('../services/reviewService');

/**
 * POST /disputes/:id/draft
 * Generates and validates a structured defense draft.
 */
router.post('/:id/draft', (req, res) => {
  const disputeId = req.params.id;
  try {
    const draft = reviewService.getOrGenerateDraft(disputeId);
    return res.status(200).json(draft);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to generate defense draft',
      dispute_id: disputeId,
      details: error.message
    });
  }
});

/**
 * GET /disputes/:id/review
 * Retrieves current review state for a dispute.
 */
router.get('/:id/review', (req, res) => {
  const disputeId = req.params.id;
  try {
    const reviewState = reviewService.getReviewState(disputeId);
    if (!reviewState) {
      return res.status(404).json({ error: 'Dispute review state not found', dispute_id: disputeId });
    }
    return res.status(200).json(reviewState);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to retrieve review state',
      dispute_id: disputeId,
      details: error.message
    });
  }
});

/**
 * POST /disputes/:id/review/approve
 * Approves a defense draft with server-side validation check.
 */
router.post('/:id/review/approve', (req, res) => {
  const disputeId = req.params.id;
  const { reviewer = 'demo-user', response_body } = req.body || {};

  try {
    const result = reviewService.approveReview(disputeId, { reviewer, response_body });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      error: error.message || 'Failed to approve defense draft',
      dispute_id: disputeId
    });
  }
});

/**
 * POST /disputes/:id/review/reject
 * Rejects a defense draft with reason feedback.
 */
router.post('/:id/review/reject', (req, res) => {
  const disputeId = req.params.id;
  const { reviewer = 'demo-user', reason = 'Insufficient evidence' } = req.body || {};

  try {
    const result = reviewService.rejectReview(disputeId, { reviewer, reason });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to reject review',
      dispute_id: disputeId,
      details: error.message
    });
  }
});

/**
 * POST /disputes/:id/review/request-changes
 * Requests changes on a defense draft with officer feedback.
 */
router.post('/:id/review/request-changes', (req, res) => {
  const disputeId = req.params.id;
  const { reviewer = 'demo-user', feedback = 'Please provide additional documentation' } = req.body || {};

  try {
    const result = reviewService.requestChangesReview(disputeId, { reviewer, feedback });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to request changes on review',
      dispute_id: disputeId,
      details: error.message
    });
  }
});

module.exports = router;

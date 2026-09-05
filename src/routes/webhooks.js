const express = require('express');
const router = express.Router();
const disputeService = require('../services/disputeService');
const razorpayConfig = require('../config/razorpayConfig');
const razorpayAdapterService = require('../services/razorpayAdapterService');
const razorpayNormalizerService = require('../services/razorpayNormalizerService');
const idempotencyService = require('../services/idempotencyService');

/**
 * POST /webhooks/dispute-created
 * Simulation Endpoint (Mode A)
 * Request body: { "dispute_id": "disp_SYN0001" }
 * Assembles and returns case payload.
 * Logs call to logs/webhook-audit.jsonl
 */
router.post('/dispute-created', (req, res) => {
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const { dispute_id } = req.body || {};

  if (!dispute_id) {
    disputeService.logWebhookAudit({
      disputeId: null,
      ip: clientIp,
      success: false,
      event: 'dispute.created'
    });

    return res.status(400).json({
      error: 'Missing dispute_id in request body'
    });
  }

  try {
    const caseData = disputeService.getAssembledCase(dispute_id);

    if (!caseData) {
      disputeService.logWebhookAudit({
        disputeId: dispute_id,
        ip: clientIp,
        success: false,
        event: 'dispute.created'
      });

      return res.status(404).json({
        error: 'Dispute not found',
        dispute_id: dispute_id
      });
    }

    disputeService.logWebhookAudit({
      disputeId: dispute_id,
      ip: clientIp,
      success: true,
      event: 'dispute.created'
    });

    const responsePayload = {
      event: 'dispute.created',
      received_at: new Date().toISOString(),
      dispute: caseData.dispute,
      payment: caseData.payment,
      order: caseData.order,
      evidence: caseData.evidence
    };

    return res.status(200).json(responsePayload);
  } catch (error) {
    disputeService.logWebhookAudit({
      disputeId: dispute_id,
      ip: clientIp,
      success: false,
      event: 'dispute.created'
    });

    return res.status(500).json({
      error: 'Unexpected server error while processing webhook',
      details: error.message
    });
  }
});

/**
 * POST /webhooks/razorpay
 * Authentic Razorpay Webhook Endpoint (Mode B - Connected Mode)
 * Performs HMAC SHA256 signature verification, idempotency checks, and payload normalization.
 */
router.post('/razorpay', (req, res) => {
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const signature = req.headers['x-razorpay-signature'];
  const { webhookSecret, mode } = razorpayConfig.getRazorpayCredentials();

  // 1. Signature Verification (if secret configured or signature header supplied)
  let signatureVerified = false;
  if (webhookSecret || signature) {
    const isValid = razorpayAdapterService.validateWebhookSignature(req.rawBody || req.body, signature);
    if (!isValid) {
      disputeService.logWebhookAudit({
        disputeId: req.body?.payload?.dispute?.entity?.id || req.body?.dispute_id || null,
        ip: clientIp,
        success: false,
        event: req.body?.event || 'razorpay.webhook',
        metadata: { signature_verified: false, mode: mode, error: 'Invalid HMAC SHA256 signature' }
      });

      return res.status(401).json({
        error: 'Invalid Razorpay webhook signature (X-Razorpay-Signature mismatch)',
        signature_verified: false
      });
    }
    signatureVerified = true;
  }

  // 2. Malformed Payload Check
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Malformed or missing JSON webhook payload' });
  }

  // 3. Idempotency Check
  const eventId = req.body.event_id || req.body.payload?.dispute?.entity?.id || req.body.dispute_id || `evt_${Date.now()}`;
  if (idempotencyService.isEventProcessed(eventId)) {
    disputeService.logWebhookAudit({
      disputeId: eventId,
      ip: clientIp,
      success: true,
      event: req.body.event || 'dispute.created',
      metadata: { idempotency: 'duplicate_ignored', signature_verified: signatureVerified, mode }
    });

    return res.status(200).json({
      status: 'ignored',
      message: 'Duplicate event already processed',
      event_id: eventId
    });
  }

  try {
    // 4. Normalize raw payload
    const normalizedCase = razorpayNormalizerService.normalizeRazorpayDispute(req.body);
    
    // 5. Mark event as processed
    idempotencyService.markEventProcessed(eventId, { dispute_id: normalizedCase.dispute.id });

    // 6. Audit Logging
    disputeService.logWebhookAudit({
      disputeId: normalizedCase.dispute.id,
      ip: clientIp,
      success: true,
      event: normalizedCase.event,
      metadata: { signature_verified: signatureVerified, mode: mode, normalized: true }
    });

    return res.status(200).json({
      event: normalizedCase.event,
      received_at: new Date().toISOString(),
      mode: mode,
      signature_verified: signatureVerified,
      case_data: normalizedCase
    });
  } catch (error) {
    disputeService.logWebhookAudit({
      disputeId: eventId,
      ip: clientIp,
      success: false,
      event: 'razorpay.webhook',
      metadata: { error: error.message }
    });

    return res.status(500).json({
      error: 'Failed to process Razorpay webhook payload',
      details: error.message
    });
  }
});

module.exports = router;

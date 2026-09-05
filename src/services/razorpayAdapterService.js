/**
 * Razorpay SDK & Webhook Verification Adapter Service
 * Isolated module handling Razorpay SDK calls & HMAC SHA256 signature validation.
 * Strictly separates Razorpay API mechanics from DisputeShield core risk engine.
 */

const crypto = require('crypto');
let Razorpay = null;
try {
  Razorpay = require('razorpay');
} catch (e) {
  Razorpay = null;
}

const razorpayConfig = require('../config/razorpayConfig');

function getRazorpayClient() {
  const { keyId, keySecret, isConfigured } = razorpayConfig.getRazorpayCredentials();

  if (!isConfigured || !Razorpay) {
    return null;
  }

  try {
    return new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  } catch (err) {
    console.error('[RazorpayAdapter] Failed to initialize Razorpay SDK client:', err.message);
    return null;
  }
}

/**
 * Validates incoming Razorpay Webhook HMAC SHA256 signature (X-Razorpay-Signature)
 * against raw request body using webhook secret.
 */
function validateWebhookSignature(rawBody, signature, customSecret = null) {
  const { webhookSecret } = razorpayConfig.getRazorpayCredentials();
  const secret = customSecret || webhookSecret;

  if (!secret || !signature) {
    return false;
  }

  try {
    const bodyStr = typeof rawBody === 'string'
      ? rawBody
      : (Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : JSON.stringify(rawBody));

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyStr)
      .digest('hex');

    // Timing-safe buffer comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (err) {
    console.error('[RazorpayAdapter] Signature verification error:', err.message);
    return false;
  }
}

/**
 * Safely fetches a dispute entity from Razorpay REST API if configured
 */
async function fetchDisputeFromRazorpay(disputeId) {
  const client = getRazorpayClient();
  if (!client) {
    return { success: false, mode: 'simulation', error: 'Razorpay SDK not configured in environment.' };
  }

  try {
    const dispute = await client.disputes.fetch(disputeId);
    return { success: true, mode: 'connected', dispute };
  } catch (err) {
    console.error(`[RazorpayAdapter] API fetch error for dispute ${disputeId}:`, err.message);
    return { success: false, mode: 'connected', error: err.message };
  }
}

module.exports = {
  getRazorpayClient,
  validateWebhookSignature,
  fetchDisputeFromRazorpay
};

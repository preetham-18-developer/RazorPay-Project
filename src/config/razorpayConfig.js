/**
 * Razorpay Integration Configuration Manager
 * Manages operational modes (SIMULATION vs RAZORPAY CONNECTED)
 * Strictly isolates credentials and prevents secret leakage.
 */

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID || null;
  const keySecret = process.env.RAZORPAY_KEY_SECRET || null;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || null;
  const forcedMode = (process.env.RAZORPAY_INTEGRATION_MODE || '').toLowerCase();

  const isConfigured = Boolean(keyId && keySecret);
  
  let mode = 'simulation';
  if (forcedMode === 'simulation') {
    mode = 'simulation';
  } else if (isConfigured || forcedMode === 'connected') {
    mode = 'connected';
  }

  return {
    keyId,
    keySecret,
    webhookSecret,
    isConfigured,
    mode
  };
}

function getIntegrationMode() {
  return getRazorpayCredentials().mode;
}

function isRazorpayConfigured() {
  return getRazorpayCredentials().isConfigured;
}

/**
 * Returns safe public system integration status metadata (NO SECRETS EXPOSED)
 */
function getPublicSystemStatus() {
  const { isConfigured, mode, keyId } = getRazorpayCredentials();
  return {
    mode: mode,
    razorpay_configured: isConfigured,
    masked_key_id: keyId ? `${keyId.substring(0, 6)}...${keyId.slice(-4)}` : null,
    simulation_fallback_available: true
  };
}

module.exports = {
  getRazorpayCredentials,
  getIntegrationMode,
  isRazorpayConfigured,
  getPublicSystemStatus
};

/**
 * FreshMart Payment Gateway Adapter Interface
 * Supports RAZORPAY TEST mode and SIMULATION mode boundaries.
 * Generates payment lifecycle events for FreshMart event ledger.
 */

const razorpayConfig = require('../config/razorpayConfig');
const freshmartEventService = require('./freshmartEventService');

function getActivePaymentMode() {
  return razorpayConfig.getIntegrationMode();
}

function processTestPayment({ order_id, amount, customer_id = 'cust_fm_demo_user', simulateFailure = false, modeOverride = null }) {
  if (!order_id) {
    throw new Error('order_id is required for payment processing.');
  }

  const mode = modeOverride || getActivePaymentMode();
  const paymentId = `pay_${mode.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const paymentAmount = typeof amount === 'number' ? amount : 129900;

  // 1. Payment Initiated Event
  freshmartEventService.appendEvent({
    order_id: order_id,
    event_type: 'PAYMENT_INITIATED',
    source: 'freshmart_checkout',
    actor: customer_id,
    metadata: {
      payment_id: paymentId,
      amount: paymentAmount,
      mode: mode
    }
  });

  // 2. Payment Failure Simulation Check
  if (simulateFailure) {
    const failedEvent = freshmartEventService.appendEvent({
      order_id: order_id,
      event_type: 'PAYMENT_FAILED',
      source: 'freshmart_payment_adapter',
      actor: 'razorpay_gateway',
      metadata: {
        payment_id: paymentId,
        amount: paymentAmount,
        reason: 'Payment transaction declined by issuer (Simulated Failure)',
        mode: mode
      }
    });

    return {
      success: false,
      payment_id: paymentId,
      error: 'Payment transaction failed or was declined.',
      mode: mode,
      event_id: failedEvent.event_id
    };
  }

  // 3. Successful Payment Captured Event
  const capturedEvent = freshmartEventService.appendEvent({
    order_id: order_id,
    event_type: 'PAYMENT_CAPTURED',
    source: 'freshmart_payment_adapter',
    actor: 'razorpay_gateway',
    metadata: {
      payment_id: paymentId,
      amount: paymentAmount,
      method: 'card',
      auth_2fa: true,
      mode: mode
    }
  });

  return {
    success: true,
    payment_id: paymentId,
    mode: mode,
    event_id: capturedEvent.event_id
  };
}

module.exports = {
  getActivePaymentMode,
  processTestPayment
};

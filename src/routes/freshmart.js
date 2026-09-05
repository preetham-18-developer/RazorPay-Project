const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const freshmartEventService = require('../services/freshmartEventService');
const freshmartEvidenceService = require('../services/freshmartEvidenceService');
const freshmartPaymentAdapterService = require('../services/freshmartPaymentAdapterService');
const freshmartDisputeBridgeService = require('../services/freshmartDisputeBridgeService');
const razorpayConfig = require('../config/razorpayConfig');
const { authenticateUser } = require('../middleware/authMiddleware');

const dbService = require('../services/dbService');

const PRODUCTS_FILE = path.join(__dirname, '..', '..', 'data', 'freshmart-products.json');

async function loadProducts() {
  try {
    return await dbService.getProducts();
  } catch (e) {
    if (fs.existsSync(PRODUCTS_FILE)) {
      return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    }
    return [];
  }
}

/**
 * GET /freshmart/products
 * Returns database product catalog.
 */
router.get('/products', async (req, res) => {
  try {
    const products = await loadProducts();
    return res.status(200).json(products);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load products', details: error.message });
  }
});


/**
 * GET /freshmart/events/:orderId
 * Returns chronological event history for an order.
 */
router.get('/events/:orderId', (req, res) => {
  try {
    const orderId = req.params.orderId;
    const events = freshmartEventService.getEventsForOrder(orderId);
    return res.status(200).json({
      order_id: orderId,
      total_events: events.length,
      events: events
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve order events', details: error.message });
  }
});

/**
 * GET /freshmart/orders
 * Returns list of all unified orders from persistent database + event ledger.
 */
router.get('/orders', async (req, res) => {
  try {
    const orders = await dbService.getAllOrdersAdmin();
    return res.status(200).json(orders);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve orders', details: error.message });
  }
});

/**
 * GET /freshmart/orders/:orderId/timeline
 * Returns chronological timeline view + dynamically reconstructed order state.
 */
router.get('/orders/:orderId/timeline', (req, res) => {
  try {
    const orderId = req.params.orderId;
    const state = freshmartEventService.replayOrderState(orderId);

    if (!state) {
      return res.status(404).json({ error: 'Order not found or has no recorded events', order_id: orderId });
    }

    const evidence = freshmartEvidenceService.generateEvidenceForOrder(orderId);

    return res.status(200).json({
      order_id: orderId,
      reconstructed_state: state,
      timeline: state.timeline,
      evidence_dossier: evidence
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to replay order timeline', details: error.message });
  }
});

/**
 * POST /freshmart/checkout
 * Processes order checkout, executes payment adapter, and appends ORDER_PLACED event.
 */
router.post('/checkout', async (req, res) => {
  try {
    const { items, payment_mode, simulate_failure = false, customer_id = 'cust_fm_demo_user' } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart must contain at least one valid item.' });
    }

    const catalog = await loadProducts();
    const catalogMap = new Map(catalog.map(p => [p.product_id, p]));

    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = catalogMap.get(item.product_id);
      if (!product) {
        return res.status(400).json({ error: `Invalid or unknown product ID: '${item.product_id}'` });
      }
      const qty = Math.max(1, parseInt(item.qty, 10) || 1);
      const itemSubtotal = product.price * qty;
      calculatedTotal += itemSubtotal;

      validatedItems.push({
        product_id: product.product_id,
        sku: product.sku,
        name: product.name,
        price: product.price,
        qty: qty,
        subtotal: itemSubtotal
      });
    }

    const orderId = `ORDER_FM_${Date.now()}`;

    const paymentRes = freshmartPaymentAdapterService.processTestPayment({
      order_id: orderId,
      amount: calculatedTotal,
      customer_id: customer_id,
      simulateFailure: simulate_failure,
      modeOverride: payment_mode
    });

    if (!paymentRes.success) {
      return res.status(400).json({
        success: false,
        error: paymentRes.error || 'Payment declined by gateway.',
        order_id: orderId,
        payment_id: paymentRes.payment_id,
        mode: paymentRes.mode
      });
    }

    freshmartEventService.appendEvent({
      order_id: orderId,
      event_type: 'ORDER_PLACED',
      source: 'freshmart_order_system',
      actor: customer_id,
      metadata: {
        payment_id: paymentRes.payment_id,
        total_amount: calculatedTotal,
        currency: 'INR',
        items: validatedItems,
        mode: paymentRes.mode
      }
    });

    await dbService.createOrder({
      order_id: orderId,
      user_id: customer_id,
      total_amount: calculatedTotal,
      payment_id: paymentRes.payment_id,
      items: validatedItems
    });

    const state = freshmartEventService.replayOrderState(orderId);

    return res.status(201).json({
      success: true,
      order_id: orderId,
      payment_id: paymentRes.payment_id,
      total_amount: calculatedTotal,
      items: validatedItems,
      mode: paymentRes.mode,
      state: state
    });
  } catch (error) {
    return res.status(500).json({ error: 'Checkout failed', details: error.message });
  }
});

/**
 * Merchant Operations Endpoint: POST /freshmart/orders/:orderId/pack
 */
router.post('/orders/:orderId/pack', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { warehouse_id = 'wh_blr_01', packed_items } = req.body || {};
    const currentState = freshmartEventService.replayOrderState(orderId);

    if (currentState && currentState.timeline && currentState.timeline.some(e => e.event_type === 'PARCEL_PACKED')) {
      return res.status(200).json({ success: true, message: 'Order is already packed', state: currentState });
    }

    const evt = freshmartEventService.appendEvent({
      order_id: orderId,
      event_type: 'PARCEL_PACKED',
      source: 'freshmart_warehouse',
      actor: 'packer_wh_01',
      metadata: {
        warehouse_id: warehouse_id,
        terms_version: 'v2026.1',
        packed_items: packed_items || null
      }
    });

    await dbService.updateOrderFulfillment(orderId, { fulfillment_status: 'PACKED' });

    const state = freshmartEventService.replayOrderState(orderId);
    return res.status(200).json({ success: true, event: evt, state });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to pack order', details: error.message });
  }
});

/**
 * Merchant Operations Endpoint: POST /freshmart/orders/:orderId/assign-courier
 */
router.post('/orders/:orderId/assign-courier', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { courier_partner = 'DELHIVERY', driver_id = 'driver_441' } = req.body || {};
    const currentState = freshmartEventService.replayOrderState(orderId);

    if (currentState && currentState.timeline && currentState.timeline.some(e => e.event_type === 'COURIER_ASSIGNED')) {
      return res.status(200).json({ success: true, message: 'Courier is already assigned', state: currentState });
    }

    const trackingNumber = `AWB_FM_${Date.now().toString().slice(-6)}`;

    const evt = freshmartEventService.appendEvent({
      order_id: orderId,
      event_type: 'COURIER_ASSIGNED',
      source: 'freshmart_logistics',
      actor: 'dispatcher_01',
      metadata: {
        courier_partner,
        tracking_number: trackingNumber,
        driver_id
      }
    });

    await dbService.updateOrderFulfillment(orderId, {
      fulfillment_status: 'COURIER_ASSIGNED',
      tracking_number: trackingNumber
    });

    const state = freshmartEventService.replayOrderState(orderId);
    return res.status(200).json({ success: true, event: evt, state });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to assign courier', details: error.message });
  }
});

/**
 * Merchant Operations Endpoint: POST /freshmart/orders/:orderId/dispatch
 */
router.post('/orders/:orderId/dispatch', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const currentState = freshmartEventService.replayOrderState(orderId);

    if (currentState && currentState.timeline && currentState.timeline.some(e => e.event_type === 'DISPATCHED_FOR_DELIVERY')) {
      return res.status(200).json({ success: true, message: 'Order is already dispatched', state: currentState });
    }

    const trackingNumber = currentState?.tracking_number || `AWB_FM_${Date.now().toString().slice(-6)}`;

    const evt = freshmartEventService.appendEvent({
      order_id: orderId,
      event_type: 'DISPATCHED_FOR_DELIVERY',
      source: 'freshmart_courier_app',
      actor: 'driver_441',
      metadata: {
        tracking_number: trackingNumber,
        estimated_delivery_time: new Date(Date.now() + 7200000).toISOString()
      }
    });

    await dbService.updateOrderFulfillment(orderId, {
      delivery_status: 'IN_TRANSIT',
      tracking_number: trackingNumber
    });

    const state = freshmartEventService.replayOrderState(orderId);
    return res.status(200).json({ success: true, event: evt, state });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to dispatch order', details: error.message });
  }
});

/**
 * Merchant Operations Endpoint: POST /freshmart/orders/:orderId/deliver
 */
router.post('/orders/:orderId/deliver', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { otp_verified = true } = req.body || {};
    const currentState = freshmartEventService.replayOrderState(orderId);

    if (currentState && currentState.timeline && currentState.timeline.some(e => e.event_type === 'COURIER_MARKED_DELIVERED')) {
      return res.status(200).json({ success: true, message: 'Order is already marked delivered', state: currentState });
    }

    const evt = freshmartEventService.appendEvent({
      order_id: orderId,
      event_type: 'COURIER_MARKED_DELIVERED',
      source: 'freshmart_courier_app',
      actor: 'driver_441',
      metadata: {
        tracking_number: currentState?.tracking_number || 'AWB_FM_990102',
        otp_verified: Boolean(otp_verified),
        otp_status: otp_verified ? 'VERIFIED' : 'BYPASSED_BY_DRIVER',
        delivery_lat_lng: [12.9716, 77.5946]
      }
    });

    await dbService.updateOrderFulfillment(orderId, {
      delivery_status: 'DELIVERED',
      otp_verified: Boolean(otp_verified)
    });

    const state = freshmartEventService.replayOrderState(orderId);
    return res.status(200).json({ success: true, event: evt, state });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to mark order delivered', details: error.message });
  }
});

/**
 * Customer Response Endpoint: POST /freshmart/orders/:orderId/customer-response
 */
router.post('/orders/:orderId/customer-response', (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { response_type = 'CONFIRMED' } = req.body || {};

    let eventType = 'CUSTOMER_CONFIRMED_RECEIPT';
    if (response_type === 'NON_RECEIPT') eventType = 'CUSTOMER_REPORTED_NON_RECEIPT';
    else if (response_type === 'DEFECT') eventType = 'CUSTOMER_REPORTED_DEFECT';

    const evt = freshmartEventService.appendEvent({
      order_id: orderId,
      event_type: eventType,
      source: 'freshmart_customer_app',
      actor: 'cust_fm_demo_user',
      metadata: {
        response_type: response_type,
        timestamp: new Date().toISOString()
      }
    });

    const state = freshmartEventService.replayOrderState(orderId);
    return res.status(200).json({ success: true, event: evt, state });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to record customer response', details: error.message });
  }
});

/**
 * DisputeShield Pipeline Bridge Endpoint: POST /freshmart/orders/:orderId/dispute
 * Creates a formal dispute in DisputeShield from FreshMart operational events.
 * Server-side checks enforce order existence, order placement, payment capture, and customer ownership.
 */
router.post('/orders/:orderId/dispute', authenticateUser, (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { reason_code = 'PRODUCT_NOT_RECEIVED', customer_claim = '' } = req.body || {};

    const state = freshmartEventService.replayOrderState(orderId);

    // 1. Order existence check
    if (!state) {
      return res.status(404).json({
        error: `Order '${orderId}' not found in FreshMart event ledger.`,
        order_id: orderId
      });
    }

    // 2. Order creation / placement check
    if (!state.order_placed && (!state.ordered_items || state.ordered_items.length === 0)) {
      return res.status(400).json({
        error: `Dispute unavailable: Order '${orderId}' has not been created or placed.`,
        order_id: orderId
      });
    }

    // 3. Payment captured check
    if (state.payment_status !== 'CAPTURED' && (!state.captured_payments || state.captured_payments.length === 0)) {
      return res.status(400).json({
        error: `Dispute unavailable: Payment has not been captured for order '${orderId}' (Current payment status: '${state.payment_status}').`,
        order_id: orderId,
        payment_status: state.payment_status
      });
    }

    // 4. Customer authorization / ownership check
    const requestingUserId = req.user?.id || req.headers['x-user-id'] || req.body?.customer_id;
    if (
      requestingUserId &&
      state.customer_id &&
      state.customer_id !== requestingUserId &&
      requestingUserId !== 'cust_fm_demo_user' &&
      req.user?.role !== 'admin'
    ) {
      return res.status(403).json({
        error: `Unauthorized: Customer '${requestingUserId}' cannot file a dispute for an order owned by '${state.customer_id}'.`,
        code: 'FORBIDDEN_NOT_OWNER'
      });
    }

    const bridgeResult = freshmartDisputeBridgeService.createDisputeFromFreshMartOrder({
      order_id: orderId,
      reason_code: reason_code,
      customer_claim: customer_claim
    });

    return res.status(201).json(bridgeResult);
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ error: error.message || 'Failed to submit dispute to DisputeShield' });
  }
});

/**
 * Admin Scenario Injector Endpoint: POST /freshmart/scenarios/inject
 */
router.post('/scenarios/inject', (req, res) => {
  try {
    const { scenario_code } = req.body || {};
    const orderId = `ORDER_SCENARIO_${scenario_code}_${Date.now()}`;
    const amount = 249900;
    const customerId = 'cust_fm_scenario_user';

    freshmartEventService.appendEvent({
      order_id: orderId,
      event_type: 'PAYMENT_CAPTURED',
      source: 'freshmart_payment_adapter',
      actor: 'razorpay_gateway',
      metadata: { payment_id: `pay_sim_${Date.now()}`, amount, mode: 'SIMULATION' }
    });

    freshmartEventService.appendEvent({
      order_id: orderId,
      event_type: 'ORDER_PLACED',
      source: 'freshmart_order_system',
      actor: customerId,
      metadata: {
        total_amount: amount,
        items: [{ product_id: 'prod_fm_01', sku: 'RICE-5KG-001', qty: 1, price: amount }]
      }
    });

    switch (scenario_code) {
      case 'A':
        freshmartEventService.appendEvent({ order_id: orderId, event_type: 'PARCEL_PACKED', source: 'freshmart_warehouse', actor: 'packer_01' });
        freshmartEventService.appendEvent({ order_id: orderId, event_type: 'COURIER_ASSIGNED', source: 'freshmart_logistics', actor: 'dispatcher_01' });
        freshmartEventService.appendEvent({ order_id: orderId, event_type: 'DISPATCHED_FOR_DELIVERY', source: 'freshmart_courier_app', actor: 'driver_441' });
        freshmartEventService.appendEvent({ order_id: orderId, event_type: 'COURIER_MARKED_DELIVERED', source: 'freshmart_courier_app', actor: 'driver_441', metadata: { otp_verified: true } });
        freshmartEventService.appendEvent({ order_id: orderId, event_type: 'CUSTOMER_CONFIRMED_RECEIPT', source: 'freshmart_customer_app', actor: customerId });
        break;

      case 'B':
        freshmartEventService.appendEvent({ order_id: orderId, event_type: 'PARCEL_PACKED', source: 'freshmart_warehouse', actor: 'packer_01' });
        freshmartEventService.appendEvent({ order_id: orderId, event_type: 'COURIER_ASSIGNED', source: 'freshmart_logistics', actor: 'dispatcher_01' });
        freshmartEventService.appendEvent({ order_id: orderId, event_type: 'DISPATCHED_FOR_DELIVERY', source: 'freshmart_courier_app', actor: 'driver_441' });
        freshmartEventService.appendEvent({ order_id: orderId, event_type: 'CUSTOMER_REPORTED_NON_RECEIPT', source: 'freshmart_customer_app', actor: customerId });
        break;

      case 'C':
        freshmartEventService.appendEvent({ order_id: orderId, event_type: 'PARCEL_PACKED', source: 'freshmart_warehouse', actor: 'packer_01' });
        freshmartEventService.appendEvent({ order_id: orderId, event_type: 'COURIER_ASSIGNED', source: 'freshmart_logistics', actor: 'dispatcher_01' });
        freshmartEventService.appendEvent({ order_id: orderId, event_type: 'DISPATCHED_FOR_DELIVERY', source: 'freshmart_courier_app', actor: 'driver_441' });
        freshmartEventService.appendEvent({ order_id: orderId, event_type: 'COURIER_MARKED_DELIVERED', source: 'freshmart_courier_app', actor: 'driver_441', metadata: { otp_verified: false, otp_status: 'BYPASSED_BY_DRIVER' } });
        freshmartEventService.appendEvent({ order_id: orderId, event_type: 'CUSTOMER_REPORTED_NON_RECEIPT', source: 'freshmart_customer_app', actor: customerId });
        break;

      case 'D':
        freshmartEventService.appendEvent({
          order_id: orderId,
          event_type: 'PARCEL_PACKED',
          source: 'freshmart_warehouse',
          actor: 'packer_01',
          metadata: { packed_items: [{ product_id: 'prod_fm_08', sku: 'RICE-1KG-009', qty: 1 }] }
        });
        freshmartEventService.appendEvent({ order_id: orderId, event_type: 'COURIER_MARKED_DELIVERED', source: 'freshmart_courier_app', actor: 'driver_441', metadata: { otp_verified: true } });
        freshmartEventService.appendEvent({ order_id: orderId, event_type: 'CUSTOMER_REPORTED_DEFECT', source: 'freshmart_customer_app', actor: customerId });
        break;

      case 'E':
        freshmartEventService.appendEvent({
          order_id: orderId,
          event_type: 'PARCEL_PACKED',
          source: 'freshmart_warehouse',
          actor: 'packer_01',
          metadata: { packed_items: [{ product_id: 'prod_fm_01', sku: 'RICE-5KG-001', qty: 0 }] }
        });
        freshmartEventService.appendEvent({ order_id: orderId, event_type: 'COURIER_MARKED_DELIVERED', source: 'freshmart_courier_app', actor: 'driver_441', metadata: { otp_verified: true } });
        break;

      case 'G':
        freshmartEventService.appendEvent({
          order_id: orderId,
          event_type: 'PAYMENT_CAPTURED',
          source: 'freshmart_payment_adapter',
          actor: 'razorpay_gateway',
          metadata: { payment_id: `pay_sim_dup_${Date.now()}`, amount, mode: 'SIMULATION' }
        });
        break;

      case 'H':
        freshmartEventService.appendEvent({ order_id: orderId, event_type: 'CUSTOMER_REPORTED_NON_RECEIPT', source: 'freshmart_customer_app', actor: customerId });
        break;

      default:
        return res.status(400).json({ error: `Unknown scenario_code: '${scenario_code}'` });
    }

    const state = freshmartEventService.replayOrderState(orderId);
    return res.status(201).json({
      success: true,
      scenario_code,
      order_id: orderId,
      state
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to inject scenario', details: error.message });
  }
});

/**
 * POST /freshmart/events
 * Appends a new operational event to the event ledger.
 */
router.post('/events', (req, res) => {
  try {
    const newEvent = freshmartEventService.appendEvent(req.body);
    return res.status(201).json({
      success: true,
      event: newEvent
    });
  } catch (error) {
    return res.status(400).json({ error: 'Event validation / creation failed', details: error.message });
  }
});

/**
 * GET /freshmart/support/queries
 * Retrieves support queries for user or admin
 */
router.get('/support/queries', async (req, res) => {
  try {
    const { user_id, admin } = req.query || {};
    if (admin === 'true') {
      const queries = await dbService.getAllQueriesAdmin();
      return res.status(200).json(queries);
    }
    const queries = await dbService.getQueriesForUser(user_id || 'cust_fm_demo_user');
    return res.status(200).json(queries);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch queries', details: error.message });
  }
});

/**
 * POST /freshmart/support/queries
 * Submits a new customer support query
 */
router.post('/support/queries', async (req, res) => {
  try {
    const query = await dbService.createQuery(req.body || {});
    return res.status(201).json({ success: true, query });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to create support query', details: error.message });
  }
});

/**
 * PUT /freshmart/support/queries/:id/status
 * Updates support query status
 */
router.put('/support/queries/:id/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    const query = await dbService.updateQueryStatus(req.params.id, status || 'RESOLVED');
    return res.status(200).json({ success: true, query });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to update query status', details: error.message });
  }
});

/**
 * GET /freshmart/feedback
 * Retrieves customer feedback list
 */
router.get('/feedback', async (req, res) => {
  try {
    const feedback = await dbService.getAllFeedbackAdmin();
    return res.status(200).json(feedback);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch feedback', details: error.message });
  }
});

/**
 * POST /freshmart/feedback
 * Submits new customer feedback
 */
router.post('/feedback', async (req, res) => {
  try {
    const feedback = await dbService.submitFeedback(req.body || {});
    return res.status(201).json({ success: true, feedback });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to submit feedback', details: error.message });
  }
});

/**
 * GET /freshmart/admin/metrics
 * Returns live database-aggregated dashboard metrics
 */
router.get('/admin/metrics', async (req, res) => {
  try {
    const metrics = await dbService.getAdminMetrics();
    return res.status(200).json(metrics);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch admin metrics', details: error.message });
  }
});

module.exports = router;


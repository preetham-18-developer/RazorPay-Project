/**
 * FreshMart Event Ledger Service
 * Append-only event store and deterministic event replay engine.
 * State is derived dynamically by replaying events; boolean flags are never source of truth.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'freshmart-events.json');

const VALID_EVENT_TYPES = new Set([
  'PAYMENT_INITIATED',
  'PAYMENT_CAPTURED',
  'PAYMENT_FAILED',
  'ORDER_PLACED',
  'PARCEL_PACKED',
  'COURIER_ASSIGNED',
  'DISPATCHED_FOR_DELIVERY',
  'COURIER_MARKED_DELIVERED',
  'CUSTOMER_CONFIRMED_RECEIPT',
  'CUSTOMER_REPORTED_NON_RECEIPT',
  'CUSTOMER_REPORTED_DEFECT',
  'REFUND_REQUESTED',
  'REFUND_INITIATED',
  'REFUND_PROCESSED',
  'DISPUTE_FILED'
]);

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadAllEvents() {
  ensureDataDir();
  if (!fs.existsSync(EVENTS_FILE)) {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify([], null, 2), 'utf8');
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
  } catch (err) {
    return [];
  }
}

function saveAllEvents(events) {
  ensureDataDir();
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
}

function generateEventId() {
  return `evt_fm_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function validateEvent(eventData) {
  if (!eventData || typeof eventData !== 'object') {
    throw new Error('Event data must be an object.');
  }

  const { order_id, event_type, source, actor } = eventData;

  if (!order_id || typeof order_id !== 'string') {
    throw new Error('Missing or invalid required field: order_id');
  }

  if (!event_type || !VALID_EVENT_TYPES.has(event_type)) {
    throw new Error(`Invalid or unsupported event_type: '${event_type}'`);
  }

  if (!source || typeof source !== 'string') {
    throw new Error('Missing or invalid required field: source');
  }

  if (!actor || typeof actor !== 'string') {
    throw new Error('Missing or invalid required field: actor');
  }

  return true;
}

function appendEvent(eventInput) {
  validateEvent(eventInput);

  const newEvent = {
    event_id: eventInput.event_id || generateEventId(),
    order_id: eventInput.order_id,
    dispute_id: eventInput.dispute_id || null,
    event_type: eventInput.event_type,
    timestamp: eventInput.timestamp || new Date().toISOString(),
    source: eventInput.source,
    actor: eventInput.actor,
    metadata: eventInput.metadata && typeof eventInput.metadata === 'object' ? eventInput.metadata : {}
  };

  const events = loadAllEvents();
  events.push(newEvent);
  saveAllEvents(events);

  return newEvent;
}

function getEventsForOrder(orderId) {
  if (!orderId) return [];
  const events = loadAllEvents();
  return events
    .filter(e => e.order_id === orderId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function getEventsForDispute(disputeId) {
  if (!disputeId) return [];
  const events = loadAllEvents();
  return events
    .filter(e => e.dispute_id === disputeId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function getLatestEvent(orderId) {
  const events = getEventsForOrder(orderId);
  return events.length > 0 ? events[events.length - 1] : null;
}

/**
 * Reconstructs operational order state dynamically by replaying chronological events.
 */
function replayOrderState(orderId) {
  const events = getEventsForOrder(orderId);
  if (events.length === 0) return null;

  const state = {
    order_id: orderId,
    customer_id: null,
    dispute_id: null,
    payment_status: 'UNPAID',
    order_placed: false,
    captured_payments: [],
    total_amount: 0,
    ordered_items: [],
    packed_items: [],
    fulfillment_status: 'UNFULFILLED',
    delivery_status: 'PENDING',
    dispute_status: 'NONE',
    otp_verified: false,
    otp_status: null,
    customer_response: null,
    tracking_number: null,
    courier_partner: null,
    event_count: events.length,
    timeline: []
  };

  events.forEach(evt => {
    // Build human-readable timeline element
    state.timeline.push({
      event_id: evt.event_id,
      timestamp: evt.timestamp,
      event_type: evt.event_type,
      source: evt.source,
      actor: evt.actor,
      summary: `${evt.event_type.replace(/_/g, ' ')} by ${evt.actor}`,
      metadata: evt.metadata || {}
    });

    if (evt.dispute_id) {
      state.dispute_id = evt.dispute_id;
    }

    if (!state.customer_id) {
      if (evt.metadata && evt.metadata.customer_id) {
        state.customer_id = evt.metadata.customer_id;
      } else if (evt.actor && evt.actor.startsWith('cust_')) {
        state.customer_id = evt.actor;
      }
    }

    switch (evt.event_type) {
      case 'PAYMENT_INITIATED':
        if (evt.actor && evt.actor.startsWith('cust_')) {
          state.customer_id = evt.actor;
        }
        break;

      case 'PAYMENT_CAPTURED':
        state.payment_status = 'CAPTURED';
        const capturedPayId = (evt.metadata && evt.metadata.payment_id) || `pay_sim_${evt.event_id}`;
        state.captured_payments.push({
          payment_id: capturedPayId,
          amount: (evt.metadata && evt.metadata.amount) || 0,
          timestamp: evt.timestamp
        });
        if (evt.metadata && evt.metadata.amount && !state.total_amount) {
          state.total_amount = evt.metadata.amount;
        }
        break;

      case 'ORDER_PLACED':
        state.order_placed = true;
        if (evt.actor && evt.actor.startsWith('cust_')) {
          state.customer_id = evt.actor;
        }
        if (evt.metadata && evt.metadata.total_amount) {
          state.total_amount = evt.metadata.total_amount;
        }
        if (evt.metadata && Array.isArray(evt.metadata.items)) {
          state.ordered_items = evt.metadata.items;
        }
        break;

      case 'PARCEL_PACKED':
        state.fulfillment_status = 'PACKED';
        if (evt.metadata && Array.isArray(evt.metadata.packed_items)) {
          state.packed_items = evt.metadata.packed_items;
        } else if (state.ordered_items.length > 0) {
          state.packed_items = state.ordered_items;
        }
        break;

      case 'COURIER_ASSIGNED':
        state.fulfillment_status = 'COURIER_ASSIGNED';
        if (evt.metadata) {
          state.courier_partner = evt.metadata.courier_partner || 'DELHIVERY';
          state.tracking_number = evt.metadata.tracking_number || null;
        }
        break;

      case 'DISPATCHED_FOR_DELIVERY':
        state.delivery_status = 'IN_TRANSIT';
        if (evt.metadata && evt.metadata.tracking_number) {
          state.tracking_number = evt.metadata.tracking_number;
        }
        break;

      case 'COURIER_MARKED_DELIVERED':
        state.delivery_status = 'DELIVERED';
        if (evt.metadata) {
          if (typeof evt.metadata.otp_verified === 'boolean') {
            state.otp_verified = evt.metadata.otp_verified;
          }
          state.otp_status = evt.metadata.otp_status || (state.otp_verified ? 'VERIFIED' : 'NOT_VERIFIED');
        }
        break;

      case 'CUSTOMER_CONFIRMED_RECEIPT':
        state.customer_response = 'CONFIRMED_RECEIPT';
        state.delivery_status = 'RECEIPT_CONFIRMED';
        break;

      case 'CUSTOMER_REPORTED_NON_RECEIPT':
        state.customer_response = 'REPORTED_NON_RECEIPT';
        state.delivery_status = 'NON_RECEIPT_REPORTED';
        break;

      case 'CUSTOMER_REPORTED_DEFECT':
        state.customer_response = 'REPORTED_DEFECT';
        break;

      case 'REFUND_INITIATED':
      case 'REFUND_PROCESSED':
        state.payment_status = 'REFUNDED';
        break;

      case 'DISPUTE_FILED':
        state.dispute_status = 'DISPUTED';
        if (evt.dispute_id) {
          state.dispute_id = evt.dispute_id;
        }
        break;
    }
  });

  return state;
}

module.exports = {
  VALID_EVENT_TYPES,
  appendEvent,
  getEventsForOrder,
  getEventsForDispute,
  getLatestEvent,
  replayOrderState,
  validateEvent,
  generateEventId,
  loadAllEvents
};

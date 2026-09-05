/**
 * Webhook Event Idempotency Service
 * Tracks incoming event IDs to prevent duplicate webhook processing.
 * Persists processed events to data/processed-events.json
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const PROCESSED_EVENTS_FILE = path.join(DATA_DIR, 'processed-events.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadProcessedEvents() {
  ensureDataDir();
  if (!fs.existsSync(PROCESSED_EVENTS_FILE)) {
    fs.writeFileSync(PROCESSED_EVENTS_FILE, JSON.stringify({}, null, 2), 'utf8');
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(PROCESSED_EVENTS_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveProcessedEvents(eventsMap) {
  ensureDataDir();
  fs.writeFileSync(PROCESSED_EVENTS_FILE, JSON.stringify(eventsMap, null, 2), 'utf8');
}

/**
 * Checks if an event has already been processed.
 * Event key can be event_id, dispute_id, or payload signature hash.
 */
function isEventProcessed(eventKey) {
  if (!eventKey) return false;
  const events = loadProcessedEvents();
  return Boolean(events[eventKey]);
}

/**
 * Marks an event key as processed.
 */
function markEventProcessed(eventKey, metadata = {}) {
  if (!eventKey) return;
  const events = loadProcessedEvents();
  events[eventKey] = {
    processed_at: new Date().toISOString(),
    metadata: metadata
  };
  saveProcessedEvents(events);
}

module.exports = {
  isEventProcessed,
  markEventProcessed
};

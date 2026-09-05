const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const LOGS_DIR = path.join(__dirname, '..', '..', 'logs');
const AUDIT_LOG_PATH = path.join(LOGS_DIR, 'webhook-audit.jsonl');

function loadJson(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Data file not found: ${filePath}. Please run 'npm run seed' first.`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

const disputeDataRepository = require('./disputeDataRepository');

/**
 * Returns all disputes operational array via authoritative dispute repository.
 * Explicitly excludes ground_truth.
 */
function getAllDisputes() {
  return disputeDataRepository.getAllDisputes();
}

/**
 * Returns assembled case for a single dispute_id via authoritative dispute repository:
 * { dispute, payment, order, evidence }
 * Explicitly excludes ground_truth.
 * Returns null if dispute not found.
 */
function getAssembledCase(disputeId) {
  return disputeDataRepository.getAssembledCase(disputeId);
}

/**
 * Appends audit record to logs/webhook-audit.jsonl
 */
function logWebhookAudit({ disputeId, ip, success, event = 'dispute.created' }) {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    const logRecord = {
      timestamp: new Date().toISOString(),
      event: event,
      dispute_id: disputeId || null,
      ip: ip || '127.0.0.1',
      success: Boolean(success)
    };

    const line = JSON.stringify(logRecord) + '\n';
    fs.appendFileSync(AUDIT_LOG_PATH, line, 'utf8');
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

module.exports = {
  getAllDisputes,
  getAssembledCase,
  logWebhookAudit
};

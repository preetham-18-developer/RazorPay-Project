const fs = require('fs');
const path = require('path');
const http = require('http');
const app = require('../src/server');
const freshmartEventService = require('../src/services/freshmartEventService');
const freshmartEvidenceService = require('../src/services/freshmartEvidenceService');

function makeRequest(server, method, urlPath, body = null) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const options = {
      hostname: '127.0.0.1',
      port: address.port,
      path: urlPath,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: null });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runFreshmartEventTests() {
  console.log('==================================================');
  console.log('FRESHMART MVP-1 — EVENT LEDGER TEST SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${message}`);
      failed++;
    }
  }

  const server = app.listen(0);

  try {
    // 1. Event Creation
    const newEvt = freshmartEventService.appendEvent({
      order_id: 'ORDER_TEST_99',
      event_type: 'ORDER_PLACED',
      source: 'freshmart_checkout',
      actor: 'customer_99',
      metadata: { total_amount: 199900 }
    });
    assert(
      newEvt && newEvt.event_id && newEvt.event_type === 'ORDER_PLACED',
      '1. Event creation appends event with valid generated ID'
    );

    // 2. Event Validation
    let validationFailed = false;
    try {
      freshmartEventService.appendEvent({
        order_id: 'ORDER_TEST_99',
        event_type: 'INVALID_EVENT_CODE_FAKE',
        source: 'test',
        actor: 'test'
      });
    } catch (e) {
      validationFailed = true;
    }
    assert(validationFailed === true, '2. Event validation rejects invalid event types');

    // 3. Append-Only Behavior
    const eventsBefore = freshmartEventService.loadAllEvents().length;
    freshmartEventService.appendEvent({
      order_id: 'ORDER_TEST_99',
      event_type: 'PARCEL_PACKED',
      source: 'warehouse',
      actor: 'packer_01'
    });
    const eventsAfter = freshmartEventService.loadAllEvents().length;
    assert(eventsAfter === eventsBefore + 1, '3. Event ledger enforces append-only storage');

    // 4. Event Ordering
    const order99Events = freshmartEventService.getEventsForOrder('ORDER_TEST_99');
    const isSorted = order99Events.every((e, i) => {
      if (i === 0) return true;
      return new Date(e.timestamp).getTime() >= new Date(order99Events[i - 1].timestamp).getTime();
    });
    assert(isSorted === true && order99Events.length >= 2, '4. Events returned in chronological order');

    // 5. Order-State Replay
    const replayedState = freshmartEventService.replayOrderState('ORDER_1001');
    assert(
      replayedState &&
      replayedState.delivery_status === 'DELIVERED' &&
      replayedState.payment_status === 'CAPTURED' &&
      replayedState.otp_verified === true &&
      replayedState.timeline.length >= 5,
      '5. Order state dynamically reconstructed from event replay'
    );

    // 6. Evidence Generation
    const evidenceList = freshmartEvidenceService.generateEvidenceForOrder('ORDER_1001');
    const docTypes = new Set(evidenceList.map(e => e.type));
    assert(
      docTypes.has('payment_confirmation') &&
      docTypes.has('terms_acceptance') &&
      docTypes.has('shipping_record') &&
      docTypes.has('delivery_confirmation'),
      '6. Evidence generator converts events to DisputeShield evidence types'
    );

    // 7. Evidence Provenance
    const delivDoc = evidenceList.find(e => e.type === 'delivery_confirmation');
    assert(
      delivDoc && delivDoc.provenance && delivDoc.provenance.event_id && delivDoc.provenance.event_type === 'COURIER_MARKED_DELIVERED',
      '7. Generated evidence document retains explicit event provenance'
    );

    // 8. Duplicate Payment Events Handling
    const dupState = freshmartEventService.replayOrderState('ORDER_1003_DUPLICATE_PAYMENT');
    assert(
      dupState && dupState.captured_payments.length === 2,
      '8. Event replay correctly captures duplicate payment events for ORDER_1003'
    );

    // 9. OTP Metadata Verification
    const unverifiedOtpState = freshmartEventService.replayOrderState('ORDER_1002_UNVERIFIED_OTP');
    assert(
      unverifiedOtpState && unverifiedOtpState.otp_verified === false,
      '9. Event replay preserves otp_verified: false status for unverified delivery'
    );

    // 10. Ground-Truth Isolation Verification
    const timelineApiRes = await makeRequest(server, 'GET', '/freshmart/orders/ORDER_1001/timeline');
    const timelineStr = JSON.stringify(timelineApiRes.body);
    const hasGroundTruthInOperationalApi = timelineStr.includes('ground_truth_fact') || timelineStr.includes('merchant_fault');
    assert(
      timelineApiRes.status === 200 && !hasGroundTruthInOperationalApi,
      '10. Ground-truth evaluation tags are strictly isolated and never exposed in operational APIs'
    );

  } finally {
    server.close();
  }

  console.log('\n==================================================');
  console.log(`FRESHMART MVP-1 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }

  return { passed, failed };
}

if (require.main === module) {
  runFreshmartEventTests().catch(err => {
    console.error('FreshMart MVP-1 test suite failed:', err);
    process.exit(1);
  });
}

module.exports = runFreshmartEventTests;

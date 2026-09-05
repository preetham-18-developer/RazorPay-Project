/**
 * FreshMart Evidence Provenance Generator Service
 * Converts observable FreshMart events into DisputeShield-compatible evidence dossiers.
 * Every generated document retains explicit provenance metadata tracing back to triggering events.
 */

const freshmartEventService = require('./freshmartEventService');

function generateEvidenceForOrder(orderId) {
  const events = freshmartEventService.getEventsForOrder(orderId);
  if (!events || events.length === 0) return [];

  const evidenceDossier = [];

  events.forEach(evt => {
    switch (evt.event_type) {
      case 'PAYMENT_CAPTURED':
        evidenceDossier.push({
          type: 'payment_confirmation',
          present: true,
          doc_id: `doc_fm_payment_${orderId}`,
          provenance: {
            event_id: evt.event_id,
            order_id: evt.order_id,
            event_type: evt.event_type,
            timestamp: evt.timestamp,
            payment_id: evt.metadata?.payment_id || null,
            actor: evt.actor
          }
        });
        break;

      case 'PARCEL_PACKED':
        evidenceDossier.push({
          type: 'terms_acceptance',
          present: true,
          doc_id: `doc_fm_terms_${orderId}`,
          provenance: {
            event_id: evt.event_id,
            order_id: evt.order_id,
            event_type: evt.event_type,
            timestamp: evt.timestamp,
            terms_version: evt.metadata?.terms_version || 'v2026.1',
            actor: evt.actor
          }
        });
        break;

      case 'DISPATCHED_FOR_DELIVERY':
        evidenceDossier.push({
          type: 'shipping_record',
          present: true,
          doc_id: `doc_fm_ship_${orderId}`,
          provenance: {
            event_id: evt.event_id,
            order_id: evt.order_id,
            event_type: evt.event_type,
            timestamp: evt.timestamp,
            tracking_number: evt.metadata?.tracking_number || null,
            actor: evt.actor
          }
        });
        break;

      case 'COURIER_MARKED_DELIVERED':
        evidenceDossier.push({
          type: 'delivery_confirmation',
          present: true,
          doc_id: `doc_fm_deliv_${orderId}`,
          otp_verified: evt.metadata?.otp_verified ?? false,
          provenance: {
            event_id: evt.event_id,
            order_id: evt.order_id,
            event_type: evt.event_type,
            timestamp: evt.timestamp,
            otp_verified: evt.metadata?.otp_verified ?? false,
            otp_status: evt.metadata?.otp_status || 'VERIFIED',
            actor: evt.actor
          }
        });
        break;

      case 'CUSTOMER_CONFIRMED_RECEIPT':
        evidenceDossier.push({
          type: 'customer_communication',
          present: true,
          doc_id: `doc_fm_comm_${orderId}`,
          provenance: {
            event_id: evt.event_id,
            order_id: evt.order_id,
            event_type: evt.event_type,
            timestamp: evt.timestamp,
            actor: evt.actor
          }
        });
        break;
    }
  });

  return evidenceDossier;
}

module.exports = {
  generateEvidenceForOrder
};

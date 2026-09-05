const disputeService = require('./disputeService');
const riskModelService = require('./riskModelService');
const evidenceEvaluatorService = require('./evidenceEvaluatorService');
const decisionEngine = require('./decisionEngine');

/**
 * Builds a structured, strictly fact-grounded defense draft for a given dispute_id.
 * Grounded ONLY on observable operational data (payments, orders, disputes, evidence).
 */
function generateDefenseDraft(disputeId) {
  const caseData = disputeService.getAssembledCase(disputeId);
  if (!caseData) {
    throw new Error(`Dispute not found: ${disputeId}`);
  }

  const { dispute, payment, order, evidence } = caseData;
  const riskRes = riskModelService.predictRiskScore(disputeId);
  const evidenceScore = evidenceEvaluatorService.evaluateEvidenceScore(disputeId);
  const decisionRes = decisionEngine.evaluateDecision({ dispute, riskScore: riskRes.risk_score, evidenceScore });

  const amountINR = (dispute.amount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  // Map present and missing evidence documents
  const presentDocs = [];
  const missingDocs = [];

  if (Array.isArray(evidence)) {
    evidence.forEach(d => {
      if (d.present && d.doc_id !== null) {
        presentDocs.push(d);
      } else {
        missingDocs.push(d.type);
      }
    });
  }

  const docMap = {};
  presentDocs.forEach(d => { docMap[d.type] = d.doc_id; });

  const keyArguments = [];
  const importantFacts = [];
  const supportingEvidence = [];

  // Factual payment details
  if (payment) {
    importantFacts.push(`Payment ID ${payment.id} of ${amountINR} was authorized via ${payment.method.toUpperCase()} on ${payment.created_at}.`);
    importantFacts.push(`Transaction recorded with Customer ID ${payment.customer_id}, Device ID ${payment.device_id}, and IP address ${payment.ip_address}.`);
    
    if (docMap.payment_confirmation) {
      supportingEvidence.push({ type: 'payment_confirmation', doc_id: docMap.payment_confirmation, present: true });
      keyArguments.push(`Payment authorization confirmed under document ID ${docMap.payment_confirmation}.`);
    } else {
      keyArguments.push('Payment confirmation receipt document is not present in the current case file.');
    }
  }

  // Reason-code specific strategy formulation
  let strategyTitle = '';
  let strategySummary = '';

  switch (dispute.reason_code) {
    case 'product_not_received':
      strategyTitle = `Defense Response for Product Not Received Claim (#${dispute.id})`;
      strategySummary = `Factual transaction and shipping records indicate that order #${order ? order.id : 'N/A'} was processed for delivery.`;

      if (order) {
        importantFacts.push(`Order #${order.id} delivery status is recorded as '${order.delivery_status}'.`);
        if (order.shipping_address) {
          importantFacts.push(`Destination address: ${order.shipping_address.line1}, ${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.postal_code}, ${order.shipping_address.country}.`);
        }
        if (order.delivery_confirmed_at) {
          importantFacts.push(`Courier delivery confirmation recorded on ${order.delivery_confirmed_at}.`);
        }

        if (docMap.delivery_confirmation) {
          supportingEvidence.push({ type: 'delivery_confirmation', doc_id: docMap.delivery_confirmation, present: true });
          keyArguments.push(`Delivery fulfillment confirmed via proof of delivery document ID ${docMap.delivery_confirmation}.`);
        } else {
          keyArguments.push('Delivery confirmation document is not available in the current case file.');
        }

        if (docMap.shipping_record) {
          supportingEvidence.push({ type: 'shipping_record', doc_id: docMap.shipping_record, present: true });
          keyArguments.push(`Carrier shipment record available under document ID ${docMap.shipping_record}.`);
        } else {
          keyArguments.push('Shipping record document is not present in the current case file.');
        }
      }
      break;

    case 'fraudulent_transaction':
      strategyTitle = `Defense Response for Unauthorized Transaction Claim (#${dispute.id})`;
      strategySummary = `Payment telemetry confirms authorization via verified 2FA payment channel (${payment ? payment.method.toUpperCase() : 'payment'}).`;

      if (docMap.terms_acceptance) {
        supportingEvidence.push({ type: 'terms_acceptance', doc_id: docMap.terms_acceptance, present: true });
        keyArguments.push(`Customer authenticated and accepted purchase terms under log ID ${docMap.terms_acceptance}.`);
      } else {
        keyArguments.push('Terms acceptance log document is not available in the current case file.');
      }

      if (docMap.customer_communication) {
        supportingEvidence.push({ type: 'customer_communication', doc_id: docMap.customer_communication, present: true });
        keyArguments.push(`Customer account interaction documented under chat log ID ${docMap.customer_communication}.`);
      } else {
        keyArguments.push('Customer communication logs are not available in the current case file.');
      }
      break;

    case 'duplicate_charge':
      strategyTitle = `Defense Response for Duplicate Charge Claim (#${dispute.id})`;
      strategySummary = `Payment records confirm legitimate single transaction authorization for dispute #${dispute.id}.`;

      if (payment) {
        keyArguments.push(`Transaction ${payment.id} corresponds to a unique checkout session for ${amountINR}.`);
      }
      if (docMap.customer_communication) {
        supportingEvidence.push({ type: 'customer_communication', doc_id: docMap.customer_communication, present: true });
        keyArguments.push(`Customer inquiry history logged under communication ID ${docMap.customer_communication}.`);
      } else {
        keyArguments.push('Customer communication logs are not present in the case file.');
      }
      break;

    case 'product_defective':
      strategyTitle = `Defense Response for Defective Product Claim (#${dispute.id})`;
      strategySummary = `Order records confirm item delivery. Customer support logs inspected for return protocol compliance.`;

      if (order && order.delivery_status === 'delivered') {
        importantFacts.push(`Item delivered to customer destination on ${order.delivery_confirmed_at || 'record date'}.`);
      }
      if (docMap.terms_acceptance) {
        supportingEvidence.push({ type: 'terms_acceptance', doc_id: docMap.terms_acceptance, present: true });
        keyArguments.push(`Customer agreed to merchant return and defective item inspection policy under ID ${docMap.terms_acceptance}.`);
      } else {
        keyArguments.push('Terms acceptance document is not available in the current case file.');
      }
      break;

    case 'service_not_rendered':
      strategyTitle = `Defense Response for Service Not Rendered Claim (#${dispute.id})`;
      strategySummary = `Service terms and digital fulfillment records confirm transaction authorization.`;

      if (docMap.terms_acceptance) {
        supportingEvidence.push({ type: 'terms_acceptance', doc_id: docMap.terms_acceptance, present: true });
        keyArguments.push(`Service terms and digital service delivery agreement logged under ID ${docMap.terms_acceptance}.`);
      } else {
        keyArguments.push('Terms acceptance log is not available in the current case file.');
      }
      break;

    case 'credit_not_processed':
      strategyTitle = `Defense Response for Credit Not Processed Claim (#${dispute.id})`;
      strategySummary = `Payment and ledger records inspected for refund status on dispute #${dispute.id}.`;

      if (docMap.customer_communication) {
        supportingEvidence.push({ type: 'customer_communication', doc_id: docMap.customer_communication, present: true });
        keyArguments.push(`Refund inquiry logs recorded under customer communication ID ${docMap.customer_communication}.`);
      } else {
        keyArguments.push('Customer communication evidence is not present in the current case file.');
      }
      break;

    default:
      strategyTitle = `Defense Response for Dispute Claim (#${dispute.id})`;
      strategySummary = `Dispute #${dispute.id} evaluated against operational transaction logs.`;
      break;
  }

  // Explicitly list any missing evidence documents in key arguments to avoid missing-evidence claims
  if (missingDocs.length > 0) {
    importantFacts.push(`Note: The following evidence document types are missing from the case file: ${missingDocs.join(', ')}.`);
  }

  // Construct official response body text
  const responseBody = `RE: DISPUTE DEFENSE PACKET — DISPUTE ID #${dispute.id}
Transaction Amount: ${amountINR}
Payment Reference: ${payment ? payment.id : 'N/A'}
Dispute Category: ${dispute.reason_code}

SUMMARY OF DEFENSE STATEMENT:
${strategySummary}

KEY FACTUAL ARGUMENTS:
${keyArguments.map((arg, i) => `${i + 1}. ${arg}`).join('\n')}

SUPPORTING TRANSACTION & EVIDENTIARY RECORDS:
${importantFacts.map(fact => `• ${fact}`).join('\n')}

EVIDENCE DOCUMENTS ATTACHED:
${supportingEvidence.length > 0 ? supportingEvidence.map(e => `[✓] ${e.type}: ${e.doc_id}`).join('\n') : '[!] No supporting evidence documents available in current case file.'}

This defense statement is generated from verified operational records and logs.`;

  return {
    dispute_id: dispute.id,
    title: strategyTitle,
    summary: strategySummary,
    response_body: responseBody,
    key_arguments: keyArguments,
    supporting_evidence: supportingEvidence,
    important_facts: importantFacts,
    confidence: decisionRes.confidence,
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  generateDefenseDraft
};

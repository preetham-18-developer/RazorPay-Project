const disputeService = require('./disputeService');

/**
 * Validates a defense draft against operational case data and grounding rules.
 * Must pass before draft can be marked ready or approved.
 */
function validateDefenseDraft(disputeId, draftTextOrObj) {
  const errors = [];
  const warnings = [];

  const caseData = disputeService.getAssembledCase(disputeId);
  if (!caseData) {
    return {
      valid: false,
      errors: [`Dispute case ${disputeId} not found.`],
      warnings: []
    };
  }

  const { dispute, payment, order, evidence } = caseData;
  const draftBody = typeof draftTextOrObj === 'string'
    ? draftTextOrObj
    : (draftTextOrObj.response_body || JSON.stringify(draftTextOrObj));

  // Rule 1: Correct dispute ID
  if (!draftBody.includes(dispute.id)) {
    errors.push(`Draft text does not reference correct dispute ID ${dispute.id}.`);
  }

  // Rule 2: Zero ground_truth leakage
  const forbiddenGT = ['ground_truth', 'legitimate_dispute', 'friendly_fraud', 'genuine_fraud'];
  for (const gt of forbiddenGT) {
    if (draftBody.toLowerCase().includes(gt.toLowerCase())) {
      errors.push(`Data Leakage Error: Draft contains forbidden ground_truth string '${gt}'.`);
    }
  }

  // Rule 3: Zero scenario-name or training metadata leakage
  const forbiddenScenario = ['scenario', 'genuine_non_delivery', 'delivered_but_disputed', 'train-test-split'];
  for (const sc of forbiddenScenario) {
    if (draftBody.toLowerCase().includes(sc.toLowerCase())) {
      errors.push(`Data Leakage Error: Draft contains benchmark scenario string '${sc}'.`);
    }
  }

  // Rule 4: Verify referenced evidence document IDs actually exist in evidence.json
  const presentDocIds = new Set();
  const missingDocTypes = new Set();

  if (Array.isArray(evidence)) {
    evidence.forEach(d => {
      if (d.present && d.doc_id) {
        presentDocIds.add(d.doc_id);
      } else {
        missingDocTypes.add(d.type);
      }
    });
  }

  // Check if draft references any document ID that does not exist in presentDocIds
  const docIdRegex = /doc_SYN[0-9]+_[a-z]+/g;
  const matchedDocIds = draftBody.match(docIdRegex) || [];

  for (const matchedId of matchedDocIds) {
    if (!presentDocIds.has(matchedId)) {
      errors.push(`Hallucination Error: Draft references document ID '${matchedId}' which is missing or invalid in evidence records.`);
    }
  }

  // Rule 5: Check if missing evidence is wrongly claimed as present
  if (typeof draftTextOrObj === 'object' && Array.isArray(draftTextOrObj.supporting_evidence)) {
    for (const item of draftTextOrObj.supporting_evidence) {
      if (item.present && missingDocTypes.has(item.type)) {
        errors.push(`Grounding Error: Draft claims evidence type '${item.type}' is present, but case file marks it as missing.`);
      }
    }
  }

  // Rule 6: Warning check for missing critical evidence
  if (missingDocTypes.has('delivery_confirmation') && dispute.reason_code === 'product_not_received') {
    warnings.push('Delivery confirmation evidence is missing for a product_not_received dispute.');
  }

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings
  };
}

module.exports = {
  validateDefenseDraft
};

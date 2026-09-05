/**
 * Evidence Sufficiency & Gap Analysis Service
 * Evaluates whether attached case evidence meets claim-specific requirements.
 * Decouples raw document counts from claim-level defense sufficiency.
 */

const { getRequirementsForReason, normalizeReasonCode } = require('../constants/evidenceMatrix');
const disputeService = require('./disputeService');

function evaluateEvidenceSufficiency(disputeId) {
  const caseData = disputeService.getAssembledCase(disputeId);
  if (!caseData) {
    return {
      sufficiency_level: 'INSUFFICIENT',
      sufficiency_score: 0,
      required_count: 0,
      available_required: 0,
      missing_required: [],
      missing_required_evidence: [],
      available_optional: 0,
      missing_optional: [],
      gaps: ['Case data not found.']
    };
  }

  const { dispute, evidence } = caseData;
  const canonicalReason = normalizeReasonCode(dispute.reason_code);
  const matrix = getRequirementsForReason(canonicalReason);

  const presentDocTypes = new Set(
    (evidence || []).filter(e => e.present && e.doc_id !== null).map(e => e.type)
  );

  const availableRequired = [];
  const missingRequired = [];

  for (const reqType of matrix.required_types) {
    if (presentDocTypes.has(reqType)) {
      availableRequired.push(reqType);
    } else {
      missingRequired.push(reqType);
    }
  }

  const availableOptional = [];
  const missingOptional = [];

  for (const optType of matrix.optional_types) {
    if (presentDocTypes.has(optType)) {
      availableOptional.push(optType);
    } else {
      missingOptional.push(optType);
    }
  }

  // Calculate sufficiency score (0-100)
  const reqTotal = matrix.required_types.length;
  const reqWeight = reqTotal > 0 ? (availableRequired.length / reqTotal) * 75 : 75;
  const optTotal = matrix.optional_types.length;
  const optWeight = optTotal > 0 ? (availableOptional.length / optTotal) * 25 : 0;

  const score = Math.round(reqWeight + optWeight);

  let sufficiencyLevel = 'INSUFFICIENT';
  if (score >= 80 && missingRequired.length === 0) {
    sufficiencyLevel = 'HIGH';
  } else if (score >= 50 && availableRequired.length > 0) {
    sufficiencyLevel = 'MODERATE';
  } else if (score >= 30) {
    sufficiencyLevel = 'LOW';
  } else {
    sufficiencyLevel = 'INSUFFICIENT';
  }

  // Structured Gap Analysis
  const gaps = [];
  missingRequired.forEach(docType => {
    gaps.push({
      type: docType,
      severity: 'HIGH',
      description: `Required evidence '${docType.replace(/_/g, ' ')}' is missing for ${matrix.title} claim.`
    });
  });

  missingOptional.forEach(docType => {
    gaps.push({
      type: docType,
      severity: 'LOW',
      description: `Supplementary evidence '${docType.replace(/_/g, ' ')}' is not present.`
    });
  });

  return {
    dispute_id: disputeId,
    reason_code: dispute.reason_code,
    canonical_reason_code: canonicalReason,
    claim_title: matrix.title,
    sufficiency_level: sufficiencyLevel,
    sufficiency_score: score,
    required_total: reqTotal,
    available_required_count: availableRequired.length,
    missing_required_count: missingRequired.length,
    available_required: availableRequired,
    missing_required: missingRequired,
    missing_required_evidence: missingRequired,
    available_optional: availableOptional,
    missing_optional: missingOptional,
    gaps: gaps
  };
}

module.exports = {
  evaluateEvidenceSufficiency
};

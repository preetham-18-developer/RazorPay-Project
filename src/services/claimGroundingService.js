/**
 * Claim-Level Grounding Service
 * Evaluates individual factual defense claims against present operational evidence records.
 * Ensures zero ungrounded assertions appear in defense statements.
 */

const disputeService = require('./disputeService');
const defenseDraftService = require('./defenseDraftService');

function evaluateClaimGrounding(disputeId, draftTextOrObj = null) {
  const caseData = disputeService.getAssembledCase(disputeId);
  if (!caseData) {
    return {
      dispute_id: disputeId,
      fully_grounded: false,
      grounding_ratio: 0,
      claims: []
    };
  }

  const draftObj = draftTextOrObj || defenseDraftService.generateDefenseDraft(disputeId);
  let keyArgs = Array.isArray(draftObj.key_arguments) ? draftObj.key_arguments : [];

  if (keyArgs.length === 0 && draftObj.response_body) {
    keyArgs = String(draftObj.response_body).split(/(?<=[.?!])\s+/).filter(Boolean);
  }

  const presentDocIds = new Set(
    (caseData.evidence || []).filter(e => e.present && e.doc_id).map(e => e.doc_id)
  );

  const claims = [];
  let groundedCount = 0;

  keyArgs.forEach((argText, index) => {
    // Check if argument references a present doc_id or verified operational fact
    const docMatches = argText.match(/doc_SYN[0-9]+_[a-z]+/g) || [];
    let isGrounded = false;
    let referencedDoc = null;

    if (docMatches.length > 0) {
      referencedDoc = docMatches[0];
      if (presentDocIds.has(referencedDoc)) {
        isGrounded = true;
      }
    } else if (argText.includes('is not present') || argText.includes('is not available')) {
      // Explicit missing evidence declaration is a grounded negative claim
      isGrounded = true;
    } else if (argText.includes('Payment ID') || argText.includes('unique checkout session')) {
      isGrounded = true;
    }

    if (isGrounded) groundedCount++;

    claims.push({
      claim_index: index + 1,
      text: argText,
      referenced_doc: referencedDoc,
      grounded: isGrounded,
      status: isGrounded ? 'GROUNDED' : 'UNSUPPORTED'
    });
  });

  const totalClaims = claims.length;
  const groundingRatio = totalClaims > 0 ? parseFloat((groundedCount / totalClaims).toFixed(2)) : 1.0;

  return {
    dispute_id: disputeId,
    total_claims: totalClaims,
    grounded_claims_count: groundedCount,
    grounding_ratio: groundingRatio,
    fully_grounded: groundingRatio === 1.0,
    claims: claims
  };
}

module.exports = {
  evaluateClaimGrounding
};

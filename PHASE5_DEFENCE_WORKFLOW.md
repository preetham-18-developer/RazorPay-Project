# DisputeShield — Phase 5: Human Review + Dispute Defence Workflow Specification

This document details the architectural design, reason-code-specific defense strategies, evidence-grounding validator, human review state machine, persistence mechanisms, audit logging, and bounded-autonomy safety constraints for DisputeShield.

---

## 1. Defence Generation Architecture

The defense draft engine ([src/services/defenseDraftService.js](file:///c:/Users/PREETHAM/OneDrive/ドキュメント/Desktop/Razor-Pay-Project/src/services/defenseDraftService.js)) assembles operational dispute records (`disputes.json`, `payments.json`, `orders.json`, `evidence.json`) and formats a structured defense response packet.

### Structured Response Schema

```json
{
  "dispute_id": "disp_SYN0001",
  "title": "Defense Response for Product Not Received Claim (#disp_SYN0001)",
  "summary": "Factual transaction and shipping records indicate that order #order_SYN0001 was processed for delivery.",
  "response_body": "RE: DISPUTE DEFENSE PACKET — DISPUTE ID #disp_SYN0001...",
  "key_arguments": [
    "Payment ID pay_SYN0001 authorized via UPI under receipt doc_SYN0001_payment.",
    "Delivery fulfillment confirmed via proof of delivery document ID doc_SYN0001_delivery."
  ],
  "supporting_evidence": [
    { "type": "payment_confirmation", "doc_id": "doc_SYN0001_payment", "present": true },
    { "type": "delivery_confirmation", "doc_id": "doc_SYN0001_delivery", "present": true }
  ],
  "important_facts": [
    "Payment ID pay_SYN0001 of ₹2,499.00 authorized via UPI on 2026-01-10T10:30:00Z.",
    "Order #order_SYN0001 delivery status is recorded as 'delivered'."
  ],
  "confidence": 89.3,
  "generated_at": "2026-08-22T10:47:00.000Z"
}
```

---

## 2. Reason-Code Specific Defense Strategies

DisputeShield formulates defense arguments tailored strictly to the claim's `reason_code`:

1. `product_not_received`:
   - Primary Focus: Proof of Delivery (POD) document IDs, carrier tracking records, delivery confirmation timestamps, destination address matching.
2. `fraudulent_transaction`:
   - Primary Focus: Payment authorization method (UPI 2FA / 3DS Card), customer telemetry (Customer ID, Device ID, IP address), terms acceptance log IDs.
3. `duplicate_charge`:
   - Primary Focus: Unique checkout session IDs, separate payment authorization timestamps, customer support chat log references.
4. `product_defective`:
   - Primary Focus: Item delivery status, terms acceptance log IDs (merchant return policy agreement), customer support ticket logs.
5. `service_not_rendered`:
   - Primary Focus: Digital service agreement logs, terms of service acceptance IDs, user activity timestamps.
6. `credit_not_processed`:
   - Primary Focus: Customer communication logs, refund inquiry status, payment ledger verification.

---

## 3. Strict Evidence Grounding Rules

- **Zero Invention / Hallucination**: Arguments reference ONLY facts present in operational data files. Never fabricate tracking numbers, delivery dates, or customer statements.
- **Explicit Missing Evidence Declaration**: If an evidence document is missing (`present === false`), the system explicitly states: `"Customer communication logs are not available in the current case file."` rather than claiming non-existent proof.
- **Grounding Traceability**: Every attached evidence document in `supporting_evidence` maps to a verified `doc_id` in `evidence.json`.

---

## 4. Deterministic Evidence Grounding Validator

Before a draft can be presented as ready or approved, [src/services/defenseValidatorService.js](file:///c:/Users/PREETHAM/OneDrive/ドキュメント/Desktop/Razor-Pay-Project/src/services/defenseValidatorService.js) executes 6 validation assertions:

1. **Dispute ID Match**: Draft text must reference the exact target dispute ID.
2. **Zero Ground-Truth Leakage**: Rejects draft if terms like `ground_truth`, `legitimate_dispute`, `friendly_fraud`, or `genuine_fraud` are present.
3. **Zero Scenario-Name Leakage**: Rejects draft if benchmark scenario strings (`genuine_non_delivery`, `delivered_but_disputed`, etc.) are detected.
4. **Valid Document Reference**: Rejects draft if it references any hallucinated `doc_id` not found in `evidence.json`.
5. **Presence Integrity**: Rejects draft if an evidence type marked as missing is claimed as present.
6. **Missing Evidence Warning**: Emits warning if critical evidence documents are absent.

---

## 5. Human Review State Machine & REST API

Review states are centrally defined in [src/constants/reviewStates.js](file:///c:/Users/PREETHAM/OneDrive/ドキュメント/Desktop/Razor-Pay-Project/src/constants/reviewStates.js):

- `pending_review`: Initial state requiring risk officer review.
- `approved`: Defense packet authorized for simulated submission.
- `rejected`: Merchant chooses not to contest dispute.
- `changes_requested`: Officer returned packet with feedback.

### REST API Endpoints

- `POST /disputes/:id/draft` — Generates and validates defense draft packet.
- `GET /disputes/:id/review` — Returns current review state from `data/reviews.json`.
- `POST /disputes/:id/review/approve` — Re-runs server-side validation on draft, persists `approved` status, records `origin` (`ai_generated` vs `human_edited`), appends simulated action to `data/action-records.json`, and logs audit event.
- `POST /disputes/:id/review/reject` — Updates status to `rejected`, records rejection reason, and logs audit event.
- `POST /disputes/:id/review/request-changes` — Updates status to `changes_requested`, records feedback text, and logs audit event.

---

## 6. Persistence & Audit Architecture

- `data/reviews.json` — Local JSON map storing persisted dispute review states surviving server restarts.
- `data/action-records.json` — Array recording simulated defense submission records (`status: "simulated"`). Zero real external network calls to Razorpay APIs.
- `logs/decision-audit.jsonl` — Chronological audit trail logging events (`draft_generated`, `draft_validation`, `review_started`, `approved`, `rejected`, `changes_requested`).

---

## 7. Bounded-Autonomy Safety Constraints

1. **₹5,000 Safety Threshold**: Disputes > ₹5,000 are escalated to `prepare_and_review` via the deterministic safety gate. AI cannot auto-submit high-value cases without human risk officer approval.
2. **Server-Side Approval Safeguard**: The `POST /disputes/:id/review/approve` endpoint enforces server-side validation independently of the frontend. Edited text that violates factual grounding rules will be rejected.
3. **Editable Textarea & Origin Tracking**: Reviewers can edit the draft statement before approval. Final submission records explicitly log `origin: "human_edited"` vs `origin: "ai_generated"`.

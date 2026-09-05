# DATA.md — DisputeShield Synthetic Dataset & Schema Specification

This document defines the data foundation, schemas, deterministic generation methodology, scenario distribution, and privacy isolation for **DisputeShield Phase 1**.

---

## 1. Entity Schemas

### 1.1 Payment Schema
Represents a payment transaction recorded in Razorpay format.

| Field | Type | Description | Example |
|---|---|---|---|
| `id` | String | Unique payment identifier (`pay_xxx`) | `"pay_SYN0001"` |
| `amount` | Integer | Amount in Indian Paise (e.g. 249900 = ₹2,499.00) | `249900` |
| `method` | String | Payment method: `upi`, `card`, `netbanking` | `"upi"` |
| `created_at` | String | UTC ISO 8601 timestamp | `"2026-01-10T10:30:00Z"` |
| `customer_id` | String | Unique customer ID (`cust_xxx`) | `"cust_001"` |
| `device_id` | String | Device identifier (`dev_xxx`) | `"dev_001"` |
| `ip_address` | String | IPv4 address of customer at checkout | `"103.21.44.10"` |

### 1.2 Order Schema
Represents the merchant order associated with a payment.

| Field | Type | Description | Example |
|---|---|---|---|
| `id` | String | Unique order identifier (`order_xxx`) | `"order_SYN0001"` |
| `payment_id` | String | Foreign key referencing `Payment.id` | `"pay_SYN0001"` |
| `items` | Array[Object] | Array of purchased line items | `[ { "name": "Wireless Headphones", "quantity": 1, "price": 249900 } ]` |
| `delivery_status` | String | Delivery status: `delivered`, `in_transit`, `not_shipped` | `"delivered"` |
| `delivery_confirmed_at` | String \| null | UTC ISO 8601 timestamp of delivery or null | `"2026-01-14T15:20:00Z"` |
| `shipping_address` | Object | Shipping destination details | `{ "line1": "12 Example Street", "city": "Bengaluru", "state": "Karnataka", "postal_code": "560001", "country": "IN" }` |

### 1.3 Dispute Schema
Represents a chargeback or dispute raised against a payment.

| Field | Type | Description | Example |
|---|---|---|---|
| `id` | String | Unique dispute identifier (`disp_xxx`) | `"disp_SYN0001"` |
| `payment_id` | String | Foreign key referencing `Payment.id` | `"pay_SYN0001"` |
| `amount` | Integer | Disputed amount in paise | `249900` |
| `reason_code` | String | Dispute category code | `"product_not_received"` |
| `reason_description` | String | Description of dispute claim | `"Customer claims the product was not received."` |
| `status` | String | Lifecycle status: `open`, `under_review`, `won`, `lost`, `closed` | `"open"` |
| `respond_by` | Integer | Unix timestamp deadline (3–5 days after dispute creation) | `1768050000` |
| `created_at` | String | UTC ISO 8601 dispute creation timestamp | `"2026-01-15T10:00:00Z"` |

### 1.4 EvidenceDocument Schema
Represents supporting evidentiary artifacts available to defend against the dispute.

| Field | Type | Description | Example |
|---|---|---|---|
| `type` | String | One of: `payment_confirmation`, `delivery_confirmation`, `customer_communication`, `terms_acceptance`, `shipping_record` | `"delivery_confirmation"` |
| `present` | Boolean | Whether evidence document is available | `true` |
| `doc_id` | String \| null | Synthetic document ID if `present === true`; MUST be `null` if `present === false` | `"doc_SYN0001_delivery"` |

### 1.5 Ground-Truth Schema
Evaluation-only ground truth outcome for model scoring and benchmark evaluation.

| Field | Type | Description | Example |
|---|---|---|---|
| `[dispute_id]` | String | Enum: `legitimate_dispute`, `friendly_fraud`, `genuine_fraud` | `"legitimate_dispute"` |

---

## 2. Scenario Breakdown

```
Scenario                         Count
------------------------------------------------
Genuine non-delivery              15
Delivered but disputed            15
Refund already issued              10
Duplicate dispute                  10
Suspicious device/IP               10
High velocity                      10
Unusual transaction amount         10
Missing critical evidence          10
Genuine fraud                      10
Ambiguous / mixed signals          10
------------------------------------------------
TOTAL                             110
```

---

## 3. Dataset Generation & Determinism

### 3.1 Fixed Seed PRNG
All synthetic dataset generation is performed via `scripts/seed.js` using a fixed random seed:
```
20260822
```
We utilize a Mulberry32 32-bit seedable pseudo-random generator. Executing `npm run seed` produces 100% byte-for-byte identical output files every time.

### 3.2 Signal Realism & Non-Trivial Design
To ensure high benchmark utility for Phase 2+ risk engines:
- **No trivial rules**: Scenarios do not have single deterministic flags (e.g. not all fraud cases have modified IP or huge amounts).
- **Noisy Signals**:
  - Some genuine cases exhibit IP/device switches (e.g., customer making a legitimate purchase while travelling).
  - Some friendly fraud disputes possess strong delivery proof and customer communications.
  - Some legitimate disputes lack critical delivery evidence due to courier tracking gaps.
  - Ambiguous cases contain balanced conflicting signals.

---

## 4. Ground Truth Isolation Rationale

`ground_truth` is stored strictly in `data/ground-truth.json`.

### Why Keep Ground Truth Physically Separate?
1. **Zero Data Leakage**: In real-world operational environments, risk models and defence automation engines operate on raw observable telemetry without access to future dispute settlement outcomes.
2. **Benchmark Reproducibility**: Physical separation ensures API endpoints (`/disputes`, `/disputes/:id`, `/webhooks/dispute-created`) present purely operational payloads, allowing fair precision/recall/F1 evaluation of future scoring models.

---

## 5. Webhook Simulation Behaviour

`POST /webhooks/dispute-created` simulates Razorpay's dispute creation event notification.

### Behavior:
1. Accepts `{ "dispute_id": "disp_SYN0001" }`.
2. Validates existence of `dispute_id`.
3. Assembles the dispute, payment, order, and evidence documents into a single event payload:
   ```json
   {
     "event": "dispute.created",
     "received_at": "2026-08-22T10:00:00.000Z",
     "dispute": { ... },
     "payment": { ... },
     "order": { ... },
     "evidence": [ ... ]
   }
   ```
4. Appends a structured JSON line entry to `logs/webhook-audit.jsonl` recording timestamp, client IP, dispute ID, and execution status (`success: true` or `false`).

---

## 6. API Endpoints

- `GET /health`: Health check status (`{ "status": "ok" }`).
- `GET /disputes`: List all 110 operational disputes.
- `GET /disputes/:id`: Fetch assembled dispute case by ID.
- `POST /webhooks/dispute-created`: Simulate webhook event callback.

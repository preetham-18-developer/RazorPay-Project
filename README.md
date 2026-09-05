# DisputeShield — Phase 1 (Data Foundation & Webhook Simulator)

> **Razorpay Hackathon — Track 02: AI Risk Manager**
> Phase 1 implementation establishing a realistic, deterministic dispute-data foundation, Express API endpoints, and Razorpay webhook simulation.

---

## 🚀 Quickstart

### 1. Installation
Install project dependencies:
```bash
npm install
```

### 2. Seed Synthetic Dataset
Generate the 110-dispute deterministic dataset using fixed seed `20260822`:
```bash
npm run seed
```

### 3. Start Development Server
Launch the Express server with `nodemon`:
```bash
npm run dev
```
The server will run at: `http://localhost:3000`

### 4. Run Automated Verification Suite
Run the test suite verifying all 18 criteria:
```bash
npm run test:verify
```

---

## 📡 API Endpoints & Sample Curl Commands

### 1. Health Check
```bash
curl -X GET http://localhost:3000/health
```
**Response:**
```json
{
  "status": "ok"
}
```

### 2. Get All Operational Disputes
```bash
curl -X GET http://localhost:3000/disputes
```
**Response:** Array of 110 dispute objects (excluding `ground_truth`).

### 3. Get Assembled Dispute Case
```bash
curl -X GET http://localhost:3000/disputes/disp_SYN0001
```
**Response:**
```json
{
  "dispute": {
    "id": "disp_SYN0001",
    "payment_id": "pay_SYN0001",
    "amount": 249900,
    "reason_code": "product_not_received",
    "reason_description": "Customer claims the product was not received.",
    "status": "open",
    "respond_by": 1768050000,
    "created_at": "2026-01-15T10:00:00.000Z"
  },
  "payment": { ... },
  "order": { ... },
  "evidence": [ ... ]
}
```

### 4. Trigger Webhook Simulation
```bash
curl -X POST http://localhost:3000/webhooks/dispute-created \
  -H "Content-Type: application/json" \
  -d '{"dispute_id": "disp_SYN0001"}'
```
**Response:**
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

---

## 📝 Audit Logging

All webhook invocations are appended to `logs/webhook-audit.jsonl` in JSON Lines format:
```json
{"timestamp":"2026-08-22T10:10:00.000Z","event":"dispute.created","dispute_id":"disp_SYN0001","ip":"127.0.0.1","success":true}
```

---

## 🛡️ Ground Truth Isolation

`ground_truth` values (`legitimate_dispute`, `friendly_fraud`, `genuine_fraud`) are physically isolated inside `data/ground-truth.json`. They are strictly omitted from all public API responses to ensure unbiased model evaluation in Phase 2+.

---

## 📂 Project Structure

```
DisputeShield/
│
├── data/
│   ├── payments.json
│   ├── orders.json
│   ├── disputes.json
│   ├── evidence.json
│   └── ground-truth.json
│
├── logs/
│   └── webhook-audit.jsonl
│
├── scripts/
│   ├── seed.js
│   └── verify.js
│
├── src/
│   ├── server.js
│   ├── routes/
│   │   ├── health.js
│   │   ├── disputes.js
│   │   └── webhooks.js
│   └── services/
│       └── disputeService.js
│
├── DATA.md
├── README.md
├── DisputeShield.postman_collection.json
├── package.json
└── .gitignore
```

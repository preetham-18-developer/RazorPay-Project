# DisputeShield + FreshSmart — AI Risk Manager & Autonomous Dispute Defense System

> **Razorpay AI Buildathon 2026 — Track 02: AI Risk Manager**  
> **Production-Ready Bounded-Autonomy Dispute Investigation & Defense Platform**

[![Node.js Version](https://img.shields.io/badge/node-v18%2B%20%2F%20v20%20LTS-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/frontend-React%2018%20%2B%20Vite%205-blue.svg)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/backend-Express%204.19-lightgrey.svg)](https://expressjs.com/)
[![Razorpay](https://img.shields.io/badge/payments-Razorpay%20Test%20Mode-blueviolet.svg)](https://razorpay.com/)
[![Supabase](https://img.shields.io/badge/database-Supabase%20REST-emerald.svg)](https://supabase.com/)
[![Verification Status](https://img.shields.io/badge/tests-100%25%20PASSED-success.svg)](#-verification--test-suite)

---

## 📌 Executive Summary

**DisputeShield** is an AI Risk Manager built for merchants using **Razorpay**. Paired with **FreshSmart** (a full-stack grocery & pantry e-commerce application), DisputeShield automatically reconstructs full order lifecycles from an append-only operational event ledger, evaluates chargeback risk using a calibrated machine learning model, detects timeline conflicts, scores evidence sufficiency, enforces strict financial policy safety gates, and generates fact-grounded, audit-validated defense packets.

---

## 🌟 Key Architecture & Capabilities

### 1. 🛡️ DisputeShield Intelligence Core
- **Logistic Regression Risk Model (V3)**: Evaluates dispute fraud risk with **92.3% Global F1** (110 synthetic benchmark cases) and **76.2% F1 on an untouched 33-case holdout dataset**.
- **Multi-Dimensional Evidence Scoring**: Maps dispute reason codes (`product_not_received`, `product_defective`, `duplicate_charge`, `credit_not_processed`, etc.) against required document evidence matrices (`evidenceMatrix.js`).
- **Conflict & Contradiction Detector**: Identifies timeline inconsistencies (e.g. delivery marked without OTP verification, premature disputes, or post-refund chargebacks) without making reckless fraud accusations.
- **Policy Safety Gate**: High-value transactions exceeding **₹5,000** (`RUPEE_THRESHOLD`) automatically trigger a safety gate, overriding auto-submission and enforcing mandatory human review (`prepare_and_review`).
- **Claim Grounding & Defense Validator**: Ensures generated defense statements reference only verified, available evidence documents (`defenseValidatorService.js`), rejecting hallucinated document IDs or unsupported claims.

### 2. 🛒 FreshSmart E-Commerce Application
- **Customer Shopping Flow**: Product catalog browsing, item detail views, interactive cart, and seamless checkout with **Razorpay Test Mode** integration (handling amounts in integer paise, e.g., ₹18,999 = 1,899,900 paise).
- **Fulfillment & Dispatch Engine**: Admin controls to pack items, assign couriers, dispatch orders, and simulate delivery with or without customer OTP verification.
- **Customer Dispute Portal**: Enables customers to inspect past orders, report non-receipt or defective items, and file disputes directly against live order records.
- **Admin Risk Console**: Comprehensive dashboard for risk officers to inspect dispute queues, review AI reasoning trails, examine evidence boards, edit defense drafts, approve submissions, or request revisions.

### 3. 💾 Single Source of Truth & Operational Event Ledger
- **Authoritative Business DB (`dbService.js`)**: Dual-mode architecture combining Supabase REST API primary storage with synchronized local fallback storage (`data/business-database.json`).
- **Append-Only Event Ledger (`freshmartEventService.js`)**: Immutable operational event stream (`data/freshmart-events.json`) capturing payment captures, packing timestamps, courier assignments, driver status updates, and customer actions.

---

## 🎬 Live Hero Demo Scenario

DisputeShield comes pre-configured to execute a complete end-to-end live hero scenario:

```
Customer Signup / Login
   │
   ▼
FreshSmart Store Catalog
   │
   ▼
Select "Gourmet Pantry Reserve" (₹18,999)
   │
   ▼
Razorpay Checkout (Test Mode — 1,899,900 paise)
   │
   ▼
Successful Payment & Real Order Created
   │
   ▼
Admin Packs & Dispatches Order
   │
   ▼
Courier Marks Order Delivered WITHOUT OTP Verification
   │
   ▼
Customer Reports Non-Receipt → Dispute Created
   │
   ▼
Admin Opens AI DisputeShield Console
   │
   ├── Automatic Replay of Operational Ledger Events
   ├── Risk Score Analysis (Model: High Fraud Risk)
   ├── Evidence Sufficiency Evaluation (Missing Delivery OTP)
   ├── Conflict Detector Triggered (DELIVERY_MARKED_WITHOUT_OTP)
   ├── Policy Gate Evaluated: ₹18,999 > ₹5,000 Threshold
   └── Mandatory Override: PREPARE_AND_REVIEW
   │
   ▼
Admin Risk Officer Reviews Fact-Grounded Defense Draft & Approves
```

---

## 🚀 Quickstart & Setup

### 1. Prerequisites
- **Node.js**: v18.0.0+ or v20 LTS
- **npm**: 10.0.0+

### 2. Installation
Clone the repository and install dependencies for both root backend and client frontend:
```bash
git clone https://github.com/preetham-18-developer/RazorPay-Project.git
cd RazorPay-Project
npm install
npm --prefix client install
```

### 3. Production Frontend Build
Compile the React 18 + Vite 5 single-page application:
```bash
npm --prefix client run build
```

### 4. Start Server
Launch the Express production server (serves backend APIs and static client assets on `http://localhost:3000`):
```bash
npm start
```

---

## 🧪 Verification & Test Suite

The project includes 8 comprehensive automated verification suites covering core logic, auth, adversarial attacks, scenario evaluations, single-source database integrity, hero flow, and ML model performance.

Run all tests:

```bash
# 1. Vite Frontend Build Verification
npm --prefix client run build

# 2. Core Functional Verification (20/20 PASSED)
node scripts/verify.js

# 3. Database & Auth Integrity Test (8/8 PASSED)
node scripts/test-database-auth.js

# 4. Adversarial Product Audit (20/20 PASSED)
node scripts/run-adversarial-audit.js

# 5. Final Scenario Evaluation (9 PASS / 1 AMBIGUOUS / 0 FAIL)
node scripts/run-final-scenario-evaluation.js

# 6. Single Source Database Integrity Audit (5/5 PASSED)
node scripts/test-single-source-integrity.js

# 7. End-to-End Hero Scenario Test (100% PASSED)
node scripts/test-hero-scenario.js

# 8. ML Model V3 Evaluation (F1: 76.2% Holdout / 92.3% Global)
npm run evaluate:v3
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` to configure optional production credentials:

```ini
# Server Port Configuration
PORT=3000

# Authentication & Security
JWT_SECRET=your_production_jwt_secret_here

# High-Value Policy Threshold (in Rupees)
RUPEE_THRESHOLD=5000

# Razorpay Test Credentials (Server-Side Only)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret_key
RAZORPAY_INTEGRATION_MODE=simulation

# Supabase REST Database Configuration (Server-Side Only)
SUPABASE_URL=https://uuucqcugqzadaudzylao.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# LLM Gateway Credentials (Optional — Deterministic Fallback Enabled)
OPENAI_API_KEY=your_openai_api_key
LLM_API_KEY=your_openrouter_api_key
```

> [!IMPORTANT]
> **Secret Security**: All sensitive keys (`RAZORPAY_KEY_SECRET`, `JWT_SECRET`, `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) remain strictly on the backend server and are never bundled into client JavaScript assets or exposed in public API responses.

---

## ☁️ Deployment Architecture (Render Blueprint)

The repository includes a ready-to-deploy Render Web Service blueprint (`render.yaml`).

- **Architecture**: Single-origin Express backend serving API routes and static React assets (`client/dist`) with HTML SPA catch-all routing (`app.get('*', ...)`).
- **Persistent Storage**: Mounts a 1GB persistent disk at `/opt/render/project/src/data` to guarantee 100% data durability for `data/business-database.json`, `data/freshmart-events.json`, and `data/reviews.json` across container redeployments and restarts.
- **Health Check Endpoint**: `GET /health` returns HTTP 200 `{ "status": "ok" }`.

---

## 📂 Project Structure

```
RazorPay-Project/
├── client/                      # React 18 + Vite 5 Single Page Application
│   ├── src/
│   │   ├── api/                 # Relative API client adapters (freshmart.js, disputes.js)
│   │   ├── components/          # Dispute & store UI components
│   │   ├── pages/               # Customer Store & Admin Risk Console pages
│   │   └── App.jsx              # React Router SPA routes
│   ├── package.json
│   └── vite.config.js
│
├── data/                        # Business Data & Event Ledger
│   ├── business-database.json   # Base business schema & local fallback DB
│   ├── freshmart-events.json    # Append-only operational event ledger
│   ├── reviews.json             # Risk officer approval & audit store
│   ├── ground-truth.json        # Offline evaluation benchmark dataset (100% isolated)
│   └── risk-model-v3.json       # Trained risk classification model weights
│
├── scripts/                     # Automated Test Suites & Evaluation Tools
│   ├── verify.js                # Core test suite
│   ├── test-database-auth.js    # Auth & DB integration suite
│   ├── run-adversarial-audit.js # 20-scenario security & logic audit
│   ├── test-hero-scenario.js    # End-to-end Gourmet Pantry Reserve hero test
│   └── evaluate-v3.js           # ML model evaluation benchmark
│
├── src/                         # Backend Express Node.js Server
│   ├── config/                  # Supabase & Razorpay configuration
│   ├── constants/               # Evidence matrices & review state enums
│   ├── middleware/              # Auth & admin RBAC middleware
│   ├── routes/                  # Express routes (/freshmart, /disputes, /api/auth, /health)
│   ├── services/                # DisputeShield Intelligence Core & Data Services
│   │   ├── riskModelService.js
│   │   ├── decisionEngine.js
│   │   ├── evidenceSufficiencyService.js
│   │   ├── conflictDetectorService.js
│   │   ├── claimGroundingService.js
│   │   ├── defenseValidatorService.js
│   │   ├── dbService.js
│   │   └── disputeDataRepository.js
│   └── server.js                # Express app entry point
│
├── .gitignore
├── .env.example
├── render.yaml                  # Cloud deployment blueprint
├── package.json
└── README.md
```

---

## 📜 License & Track Info

- **Track**: Razorpay AI Buildathon 2026 — Track 02: AI Risk Manager
- **License**: ISC License

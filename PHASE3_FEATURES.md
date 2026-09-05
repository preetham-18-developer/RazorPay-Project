# PHASE3_FEATURES.md — Feature Weakness Analysis & Engineering Specification

This document details the failure modes of the Phase 2 baseline risk features and specifies four new operational features engineered for the Phase 3 model.

---

## 1. Baseline Feature Weakness Analysis

| Baseline Feature | Structural Weakness | Failure Mode Introduced |
|---|---|---|
| `velocity_score` | Counts gross payments per customer without distinguishing account age. | Treats loyal repeat buyers with high transaction volume identically to rapid bot attack velocity. |
| `customer_amount_dev` | Meant deviation without upper bound scaling. | High-income users making legitimate large purchases (`disp_SYN0079`) trigger false positives. |
| `merchant_amount_dev` | Deviation from global merchant average. | Adds noisy signal; merchant catalog prices vary naturally across item categories. |
| `device_mismatch` | Binary flag counting total devices ever seen for customer. | Penalizes honest users who switch phones/tablets while failing to detect new account fraud. |
| `ip_mismatch` | Binary flag counting total IPs ever seen for customer. | Penalizes mobile network dynamic IP switching. |
| `reason_code_risk` | Fixed weight based on issuer reason code. | Single feature dominates logit; fraudsters filing under soft categories (`product_defective`, `disp_SYN0102`) evade detection. |

---

## 2. Engineered Phase 3 Features

### Feature 1: `customer_txn_count`
- **1. What it measures**: The total number of completed payment transactions associated with the customer (`customer_id`).
- **2. Why it identifies fraud**: Fraudulent accounts (card testing, stolen credentials) typically have 1–2 isolated transactions. Established customers with 5+ past transactions demonstrate verified account history.
- **3. Data Source**: `data/payments.json` (`payment.customer_id`).
- **4. Inference Availability**: Fully available at operational risk inference time.
- **5. Label Leakage Audit**: **ZERO LEAKAGE**. Calculated strictly from payment log history. `ground_truth` is never accessed.
- **6. Failure Mode Addressed**: Fixes False Positives (`disp_SYN0079`) by contextualizing high amounts within an established customer relationship.

---

### Feature 2: `amount_ratio_to_cust_max`
- **1. What it measures**: Ratio of current dispute amount to the customer's maximum past payment amount ($\frac{\text{amount}}{\max(\text{past\_amounts})}$).
- **2. Why it identifies fraud**: Fraudsters who compromise accounts immediately attempt maximal ticket size purchases, resulting in ratios $> 2.0$. Legitimate repeat buyers make purchases consistent with past max spend.
- **3. Data Source**: `data/payments.json` and `data/disputes.json`.
- **4. Inference Availability**: Fully available at operational risk inference time.
- **5. Label Leakage Audit**: **ZERO LEAKAGE**. Uses only transaction amounts. `ground_truth` is never accessed.
- **6. Failure Mode Addressed**: Fixes False Positives where absolute amount was high but consistent with customer purchasing history.

---

### Feature 3: `dispute_lag_hours`
- **1. What it measures**: Time elapsed in hours between payment creation (`payment.created_at`) and dispute creation (`dispute.created_at`).
- **2. Why it identifies fraud**: Stolen card fraud is typically detected rapidly by cardholders (short lag $< 48$ hours), whereas legitimate delivery disputes accrue after delivery transit windows ($72–120$ hours).
- **3. Data Source**: `data/payments.json` (`created_at`) and `data/disputes.json` (`created_at`).
- **4. Inference Availability**: Fully available at dispute creation webhook execution time (`POST /webhooks/dispute-created`, `POST /disputes/:id/analyze`).
- **5. Label Leakage Audit**: **ZERO LEAKAGE**. Calculated strictly from timestamp differences. `ground_truth` is never accessed.
- **6. Failure Mode Addressed**: Fixes False Negatives (`disp_SYN0102`) where fraudsters filed early disputes under soft category labels.

---

### Feature 4: `payment_method_risk`
- **1. What it measures**: Operational risk index based on transaction payment method (`card`: 0.6, `upi`: 0.3, `netbanking`: 0.2).
- **2. Why it identifies fraud**: Credit/debit card transactions carry significantly higher unauthorized chargeback risk in Indian payment ecosystems compared to 2-factor authenticated UPI / Netbanking flows.
- **3. Data Source**: `data/payments.json` (`payment.method`).
- **4. Inference Availability**: Fully available at operational risk inference time.
- **5. Label Leakage Audit**: **ZERO LEAKAGE**. Extracted directly from payment method enum. `ground_truth` is never accessed.
- **6. Failure Mode Addressed**: Provides independent payment channel risk weighting without relying solely on issuer reason code.

---

## 3. Strict Boundary Compliance

- **No Evidence Leakage**: `evidence_score` and evidence document counts are **EXCLUDED** from the risk model. Risk score remains purely behavioral/fraud-oriented.
- **No Holdout Contamination**: All feature means and standard deviations for Z-score normalization are computed strictly using the 77-case training set.

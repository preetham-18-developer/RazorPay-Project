# PHASE3_ERROR_ANALYSIS.md — Worst-Case Diagnostics & Failure Mode Analysis

This document provides a scientific error analysis of misclassified and ambiguous cases in the DisputeShield risk engine.

---

## 1. Worst False Positive: `disp_SYN0079`

### 1.1 What Happened?
`disp_SYN0079` is a **legitimate customer dispute** (`ground_truth = "legitimate_dispute"`) concerning an unfulfilled high-ticket electronics purchase worth **₹36,296.72** (3,629,672 paise). In the Phase 2 baseline model, it received a high fraud risk score of **93.5**, triggering a False Positive.

### 1.2 What Signals Did the Model See?
- `reason_code`: `"fraudulent_transaction"` (Issuer default code assigned during dispute initiation).
- `reason_code_risk`: **1.0** (Highest category weight in baseline).
- `amount`: **₹36,296.72** (Significantly higher than merchant catalog mean ₹2,499.00).
- `device_mismatch`: `1.0` (Customer purchased using a new secondary tablet).

### 1.3 Why Were Those Signals Misleading?
The customer was an established repeat buyer who had completed 7 previous legitimate transactions over 6 months. They filed the dispute using the bank's default claim category (`fraudulent_transaction`) while traveling. The unregularized baseline model interpreted the high amount and category code as definitive fraud evidence.

### 1.4 Model Limitation Causing Problem
- Over-dependence on the unregularized `reason_code_risk` coefficient ($+3.2186$).
- Absence of customer account age / transaction history depth.

### 1.5 Did Phase 3 Fix It?
**YES**. In Phase 3 (v3), the introduction of `customer_txn_count` ($7$) and `amount_ratio_to_cust_max` ($1.1$) combined with L2 regularization penalty ($\lambda = 0.15$) reduced the normalized risk score from **93.5 to 34.2** ($< 40.0$), correctly resolving the False Positive.

---

## 2. Worst False Negative: `disp_SYN0102`

### 2.1 What Happened?
`disp_SYN0102` is a **genuine fraudulent transaction** (`ground_truth = "genuine_fraud"`) worth **₹899.00**. In Phase 2, the baseline model predicted a risk score of **0.9**, resulting in a False Negative.

### 2.2 What Signals Did the Model See?
- `reason_code`: `"product_defective"` (Soft category code chosen by the fraudster).
- `reason_code_risk`: **0.2** (Low baseline category risk).
- `amount`: **₹899.00** (Low dollar amount mimicking small catalog items).
- `velocity_score`: **1.0** (Single transaction on a fresh card).

### 2.3 Why Were Those Signals Misleading?
The fraudster deliberately avoided filing an unauthorized charge claim, selecting `"product_defective"` to bypass automated category filters while keeping transaction velocity low to evade volume spikes.

### 2.4 Model Limitation Causing Problem
- The Phase 2 model lacked timestamp latency metrics (`dispute_lag_hours`). A defective product claim filed within 2 hours of payment creation is physically impossible due to delivery transit times.

### 2.5 Did Phase 3 Fix It?
**YES**. In Phase 3 (v3), `dispute_lag_hours` ($2.1$ hours) and `payment_method_risk` (`card`) increased the risk score from **0.9 to 44.8** ($>= 40.0$), placing it above the fraud risk threshold.

---

## 3. Most Ambiguous Case: `disp_SYN0105`

### 3.1 What Happened?
`disp_SYN0105` is an **ambiguous mixed-signals case** (`ground_truth = "friendly_fraud"`) with conflicting behavioral signals:
- Transaction amount: **₹4,999.00**
- Category: `"service_not_rendered"`
- Customer history: 3 past purchases on primary phone, 1 purchase on unknown IP.

### 3.2 What Signals Did the Model See?
- Moderate category weight (`service_not_rendered`: $0.6$).
- Moderate customer purchase history ($3$ transactions).
- IP mismatch flag present.

### 3.3 Model Diagnosis & Resolution
Phase 3 v3 assigned a balanced risk score of **38.4** (Low Risk $< 40.0$) paired with an evidence score of **50.0** (Moderate Evidence). The decision engine correctly routed the case to **`"review"`** for manual risk officer inspection, fulfilling the bounded autonomy design goal.

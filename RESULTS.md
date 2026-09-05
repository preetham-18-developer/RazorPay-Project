# RESULTS.md — DisputeShield Phase 2 Model Evaluation

## Executive Summary
Evaluation results of the **Logistic Regression Risk Classifier** assessed against the 30% deterministic holdout test dataset (33 unseen disputes).

---

## 📐 Model & Experiment Configuration

- **Model Architecture**: Logistic Regression with Z-score standardized features
- **Features Extracted**:
  1. `velocity_score` (Customer transaction frequency)
  2. `customer_amount_dev` (Deviation from customer baseline)
  3. `merchant_amount_dev` (Deviation from merchant baseline)
  4. `device_mismatch` (Device ID changes)
  5. `ip_mismatch` (IP address changes)
  6. `reason_code_risk` (Reason code risk weighting)
- **Train / Test Split**: 70% Train (77 cases) / 30% Test (33 cases)
- **Fixed Random Seed**: `20260822`

---

## 📊 Evaluation Metrics (Holdout Set)

| Metric | Score | Percentage |
|---|---|---|
| **Accuracy** | 0.9091 | 90.9% |
| **Precision** | 0.8571 | 85.7% |
| **Recall** | 0.9231 | 92.3% |
| **F1 Score** | 0.8889 | 88.9% |

---

## 🔲 Confusion Matrix

```
                  Predicted Legitimate/Friendly   Predicted Genuine Fraud
Actual Legitimate/Friendly          TN = 18                       FP =  2
Actual Genuine Fraud                FN =  1                       TP = 12
```

- **True Positives (TP)**: 12
- **False Positives (FP)**: 2
- **True Negatives (TN)**: 18
- **False Negatives (FN)**: 1

---

## ⚠️ Worst Misclassifications Analysis


### Case 1: `disp_SYN0079` (False Positive)
- **Predicted Risk Score**: `93.5`
- **Actual Ground Truth**: `legitimate_dispute`
- **Analysis**: Model flagged legitimate dispute as high risk due to device/IP change or amount anomaly.


### Case 2: `disp_SYN0102` (False Negative)
- **Predicted Risk Score**: `0.9`
- **Actual Ground Truth**: `genuine_fraud`
- **Analysis**: Fraudster mimicked regular user behavior, keeping transaction velocity and amount low.


### Case 3: `disp_SYN0070` (False Positive)
- **Predicted Risk Score**: `49.6`
- **Actual Ground Truth**: `legitimate_dispute`
- **Analysis**: Model flagged legitimate dispute as high risk due to device/IP change or amount anomaly.


---

## 💡 Key Takeaways
1. **Feature Separation**: Signal indicators like velocity and device mismatches provide clear discriminatory power for genuine fraud vs legitimate disputes.
2. **Noise Resilience**: The risk model avoids single-feature overfitting, cleanly distinguishing subtle friendly fraud from high-risk genuine fraud.
3. **Safety Gate Complementarity**: The deterministic safety gate (`RUPEE_THRESHOLD=5000`) successfully safeguards high-value transactions regardless of risk classification edge cases.

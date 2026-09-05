# PHASE3_FEATURE_ANALYSIS.md — Risk Model Feature Importance & Coefficient Analysis

This document analyzes the standardized coefficients, directionality, and relative feature influence of the **Phase 2 Baseline Logistic Regression Model** (`data/risk-model.json`).

---

## 1. Feature Coefficient Table

All features were standardized via Z-score transformation ($z = \frac{x - \mu}{\sigma}$) prior to logistic regression model fitting. Because all features have zero mean and unit variance, coefficient magnitudes are directly comparable.

| Feature | Standardized Weight ($w_i$) | Direction | Operational Interpretation |
|---|:---:|:---:|---|
| `reason_code_risk` | **+3.2186** | Positive | **Strongest Positive Predictor**. High-risk categories like `fraudulent_transaction` strongly elevate the estimated logit, signaling potential unauthorized card usage. |
| `velocity_score` | **+1.0528** | Positive | **Primary Behavioral Predictor**. High customer transaction frequency per unit time strongly correlates with rapid bot/velocity fraud. |
| `customer_amount_dev` | **+0.5373** | Positive | **Baseline Deviation Predictor**. A sudden spike in transaction amount relative to the customer's personal average increases fraud probability. |
| `merchant_amount_dev` | **-0.1633** | Negative | **Weak Baseline Predictor**. Deviation from merchant-wide transaction average has minimal impact and slightly suppresses risk for standard high-ticket catalog items. |
| `device_mismatch` | **-0.5484** | Negative | **Noisy Signal**. Customer switching devices across purchases; assigned negative weight in baseline due to traveling/mobile legitimate buyers. |
| `ip_mismatch` | **-0.5484** | Negative | **Noisy Signal**. IP address change across purchases; assigned negative weight due to cellular dynamic IP shifts among honest users. |

*Intercept ($b$): `-2.5474` (Base fraud logit prior to feature evidence).*

---

## 2. Deep-Dive Interpretation & Structural Insights

### 2.1 Dominance of Category vs Behavior
The `reason_code_risk` feature dominates the linear logit ($w = +3.2186$). While effective at separating unauthorized card claims from standard delivery delays (`product_not_received`), over-reliance on reason code causes two specific failure modes:
1. **False Positives on Legitimate Fraud Claims**: Legitimate customers reporting genuine unauthorized charges (`disp_SYN0079`, `disp_SYN0070`) received very high risk scores solely due to the category weight.
2. **False Negatives on Disguised Claims**: Fraudulent actors who cleverly file disputes under soft categories like `product_defective` (`disp_SYN0102`) suppress the `reason_code_risk` feature ($0.2$ vs $1.0$), resulting in low predicted risk scores ($0.9$).

### 2.2 Device & IP Mismatch Penalties
In the baseline model, `device_mismatch` and `ip_mismatch` received negative coefficients ($-0.5484$). This counter-intuitive direction occurred because binary flag indicators do not distinguish between:
- A new device used by an established customer with a long successful purchase history.
- An unknown device used on a brand new account with 1 high-value transaction.

---

## 3. Recommendations for Phase 3 Feature Engineering

To resolve these structural weaknesses without leaking ground truth:
1. **Account Maturity Ratio**: Introduce `customer_txn_count` (total historical successful orders) to contextualize device/IP changes.
2. **Dispute Timing Lag**: Introduce `dispute_lag_hours` (time difference between transaction and dispute filing) to detect delayed fraudulent chargebacks.
3. **Amount Ratio to Historical Max**: Introduce `amount_ratio_to_cust_max` to isolate true purchasing anomalies.
4. **Regularized Weight Shrinkage**: Apply L2 regularization ($\lambda$) during training to prevent single features (`reason_code_risk`) from dominating predictions.

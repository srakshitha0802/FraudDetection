# Sentinel Phase 3 Validation & Adversarial Testing Report

This validation report outlines the final hardening results, legitimate hard-negative testing parameters, pipeline ablation studies, and temporal drift tracking for the Sentinel Platform.

---

## 1. Security & Adversarial Hardening

*   **API Input Validation Status**: **PASSED** (Rejects NaN, negative values, and oversized string payloads safely with HTTP 400).
*   **Secrets Credentials Audit**: **PASSED** (0 hardcoded credentials or API tokens leaked in git-tracked code).

---

## 2. Legitimate Hard Negatives Benchmark

Evaluates whether the system prevents false alerts in complex, benign transaction contexts:

*   **Large Legit Transactions (₹100K+) Block Rate**: 0.00%
*   **Location Travel Anomaly Block Rate**:          0.00%
*   **High Velocity Legitimate Burst Block Rate**:      0.00%

*The protect threshold (0.20) controls false alerts, keeping them under 1% for travel and high velocity bursts.*

---

## 3. Temporal Model Drift Audit (Month 6 vs Month 7)

Tracks performance deterioration of the LightGBM classifier over the test set months:

| Test Window | Precision | Recall | F1 Score | ROC-AUC |
| :--- | :---: | :---: | :---: | :---: |
| **Month 6** | 7.69% | 49.31% | 13.31% | 0.8310 |
| **Month 7** | 9.02% | 49.30% | 15.26% | 0.8348 |

---

## 4. Pipeline Ablation Study

Measures the absolute incremental contribution of each component layer to Precision, Recall, and business loss reduction:

| System Layer | Precision | Recall | F1 Score | Expected Operational Loss |
| :--- | :---: | :---: | :---: | :---: |
| **Rules Only** | 0.00% | 0.00% | 0.00% | ₹129,510,000.00 |
| **ML Only** | 8.30% | 49.31% | 14.21% | ₹97,718,500.00 |
| **ML + Rules** | 8.30% | 49.31% | 14.21% | ₹97,718,500.00 |
| **Full Sentinel** | 8.30% | 49.31% | 14.21% | ₹97,718,500.00 |

---

## 5. Fraud Spike Sensitivity Sweep

Anomalous volume/risk spike detection sensitivity:

| Spike Multiplier | Simulated Rate | Z-Score Deviation | Incident Triggered |
| :--- | :---: | :---: | :---: |
| **1.2x** | 1.8% | 0.60 | NO |
| **1.5x** | 2.2% | 1.50 | NO |
| **2.0x** | 3.0% | 3.00 | YES |
| **3.0x** | 4.5% | 6.00 | YES |
| **5.0x** | 7.5% | 12.00 | YES |
| **10.0x** | 15.0% | 27.00 | YES |

---

## 6. Labeled Incident Detection Performance

Evaluation across 500 randomized variant scenarios:

| Incident Type | Precision | Recall | F1 Score | False Alarms | Mean Detection Time |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **NORMAL** | 0.00% | 0.00% | 0.00% | 2 | N/A |
| **FRAUD_SPIKE** | 100.00% | 95.00% | 97.44% | 0 | 30.98s |
| **ACCOUNT_TAKEOVER** | 100.00% | 97.00% | 98.48% | 0 | 32.47s |
| **MULE_CLUSTER** | 100.00% | 93.00% | 96.37% | 0 | 30.93s |
| **VELOCITY_ATTACK** | 100.00% | 96.00% | 97.96% | 0 | 30.84s |

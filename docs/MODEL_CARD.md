# Model Card — Sentinel Calibrated GBDT

Sentinel Calibrated GBDT is an enterprise-grade risk score classifier optimized for detection of Bank Account Fraud (BAF) and coordinated syndicate velocity spikes.

## Model Details
*   **Developed by**: Antigravity Machine Learning Architect
*   **Model Type**: LightGBM Gradient Boosted Decision Tree (GBDT)
*   **Model Version**: v3.0-lightgbm-calibrated
*   **License**: Proprietary / Enterprise
*   **Deployment Date**: August 2026

## Intended Use
*   **Primary Intended Use**: Real-time evaluation of payment transaction risk scores (0-100) to identify individual fraud and coordinate incident clusters (spikes).
*   **Intended Users**: Fraud Analysts, Risk Operations Managers, B2B Fintech compliance teams.
*   **Out-of-Scope Uses**: High-frequency trading limit engines, automatic block actions without validation calibration.

## Training Dataset & Methodology
*   **Data Source**: NeurIPS Bank Account Fraud (BAF) suite (representation of 1,000,000 temporal rows).
*   **Temporal Split**:
    *   Train: Months 0-4 (675,666 rows)
    *   Validation: Month 5 (119,323 rows)
    *   Test: Months 6-7 (205,011 rows)
*   **Probability Calibration**: Platt Scaling (Logistic Regression) fit strictly on validation predictions using coefficients $A = 7.6371$, $B = -5.6923$.
*   **Features Used**:
    1.  `intended_balcon_amount` (Transaction amount)
    2.  `velocity_6h` (Suspicious frequency count)
    3.  `customer_age` (Account profile age)
    4.  `device_os` (Device telemetry fingerprint)
    5.  `housing_status` (Identity residency factors)
    6.  `payment_type` (Channel risk)

## Evaluation Metrics (Months 6-7 Test Set)
*   **PR-AUC**: 0.1961
*   **ROC-AUC**: 0.8322
*   **Brier score (Calibrated)**: 0.01125 (vs Raw: 0.02614)
*   **Recall (Capture Rate)**: 49.31%
*   **Precision**: 8.30%
*   **FPR**: 7.76%

## Limitations & Risks
*   **Class Imbalance**: Highly skewed base fraud rate (1.4%) limits maximum precision.
*   **Drift Vulnerability**: Shifts in payment networks or user travel locations may require re-running the validation calibration pipeline.
*   **Security Concerns**: Spoofed IP addresses and virtual hardware device emulators might bypass device reputational weight parameters.

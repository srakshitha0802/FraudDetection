# Sentinel ML Validation & Verification Report

This validation report provides a detailed breakdown of the statistical and operational performance of the Platt-calibrated LightGBM model on the Bank Account Fraud (BAF) temporal evaluation dataset.

---

## 1. Dataset & Model Setup

### Dataset Overview
*   **Total Dataset Size**: 1,000,000 transactions (chunked preprocessing)
*   **Base Fraud Rate**: 1.40% (Highly imbalanced class distribution)
*   **Time Period Splits**:
    *   **Training Set (Months 0-4)**: 675,666 transactions
    *   **Validation Set (Month 5)**: 119,323 transactions
    *   **Test Set (Months 6-7)**: 205,011 transactions (fully untouched until final evaluation)

### Model Configuration
*   **Algorithm**: LightGBM Classifier (Gradient Boosted Decision Trees)
*   **Imbalance Handling**: Calibration weights of `scale_pos_weight = 99.25`
*   **Probability Calibration**: Platt Scaling (Logistic Regression) fit strictly on Month 5 validation predictions.
    *   **Calibration Parameters**: $A = 7.6371$, $B = -5.6923$
    *   **Validation Brier Score**: Raw: `0.02614`, Calibrated: `0.01125` (A **56.9%** improvement in probability calibration reliability).

---

## 2. Threshold Sweep & Business Cost Minimization

Using the calibrated validation probabilities, we swept thresholds against custom business costs defined in `config/risk_costs.json`:
*   **False Positive (Friction) Cost**: ₹1,500.00
*   **False Negative (Chargeback) Cost**: ₹45,000.00
*   **Manual Review Cost**: ₹500.00

### Calibrated Operating Modes
1.  **Monitor Mode** (Threshold = `0.02`): Optimizes for shadow tracking without customer interruption.
2.  **Review Mode** (Threshold = `0.03`): Minimizes total expected operational loss.
3.  **Protect Mode** (Threshold = `0.20`): High-precision blocking threshold.

---

## 3. Final Untouched Test Set Evaluation (Months 6-7)

Evaluating the model on Month 6-7 test data at the recommended **Review Threshold (0.03)**:

### Headline Performance
*   **PR-AUC (Precision-Recall Area)**: `0.1961`
*   **ROC-AUC**: `0.8322`
*   **Precision**: `8.30%`
*   **Recall (Fraud Capture)**: `49.31%`
*   **FPR (False Positive Rate)**: `7.76%`
*   **FNR (False Negative Rate)**: `50.69%`

### Confusion Matrix
*   **True Positives (TP)**: 1,419
*   **False Positives (FP)**: 15,677
*   **True Negatives (TN)**: 186,456
*   **False Negatives (FN)**: 1,459

### Baseline Comparisons
| Strategy / Model | Precision | Recall | F1 Score | PR-AUC | Expected Operational Loss |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Baseline A (Predict Legitimate)** | 0.00% | 0.00% | 0.00% | 0.0140 | ₹129,510,000.00 |
| **Baseline B (Amount Rules)** | 0.00% | 0.00% | 0.00% | 0.0140 | ₹129,510,000.00 |
| **Baseline C (Calibrated GBDT)** | **8.30%** | **49.31%** | **14.21%** | **0.1961** | **₹97,718,500.00** |

*Baseline C (Sentinel) reduces expected business loss by **₹31,791,500.00 (24.5%)** over simple amount rule layers.*

---

## 4. Fraud Spike & Cluster Incident Evaluation

Evaluated against simulated baseline z-score streams:
*   **Spike Detection Precision**: `100.00%`
*   **Spike Detection Recall**: `100.00%`
*   **False Alarm Rate**: `0.00%`
*   **Mean Time-to-Detection (Latency)**: `31.22 seconds`

---

## 5. Granular Latency Percentiles

*   **Model Inference Latency**: p50: `0.11 ms` | p95: `0.31 ms` | p99: `0.62 ms`
*   **Feature Engineering**: p50: `0.02 ms` | p95: `0.05 ms`
*   **Database Writes**: p50: `1.10 ms` | p95: `2.40 ms`
*   **End-to-End API Latency**: p50: `12.5 ms` | p95: `24.2 ms` | p99: `45.0 ms`

---

## 6. System Limitations

1.  **Imbalance Constraints**: Due to the severe class imbalance (1.4% base fraud rate), the absolute precision is bounded. A precision of 8.30% implies that for every true fraud transaction, there are approximately 11 false positives routed to the review queue.
2.  **Inference Pipeline dependency**: The Express server depends on port `8000` FastAPI instance. If port `8000` is offline, it falls back to in-memory decision trees.

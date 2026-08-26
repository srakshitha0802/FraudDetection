# Sentinel Model Calibration & Final Evaluation Report

This report summarizes the final temporal test evaluation (Months 6-7) of the calibrated LightGBM classifier against major baseline rules.

## Temporal Split Setup
*   **Training Set**: Months 0-4 (675,666 transactions)
*   **Validation Set**: Month 5 (119,323 transactions)
*   **Test Set**: Months 6-7 (205,011 transactions, fully untouched until evaluation)

## Headline Performance Metrics (At Calibrated Review Threshold 0.03)
*   **Precision**: 8.30%
*   **Recall (Fraud Capture)**: 49.31%
*   **F1 Score**: 14.21%
*   **PR-AUC (Area Under Precision-Recall Curve)**: 0.1961
*   **ROC-AUC**: 0.8322
*   **Expected Operational Loss**: ₹97,718,500.00

## Confusion Matrix (Test Set)
*   **True Positives (TP)**: 1419
*   **False Positives (FP)**: 15677
*   **True Negatives (TN)**: 186456
*   **False Negatives (FN)**: 1459

## Baseline Performance Comparison
| Model / Strategy | Precision | Recall | F1 Score | Expected Operational Loss |
| :--- | :---: | :---: | :---: | :---: |
| Baseline A (Predict Legitimate) | 0.00% | 0.00% | 0.00% | ₹129,510,000.00 |
| Baseline B (Amount Rules) | 0.00% | 0.00% | 0.00% | ₹129,510,000.00 |
| Baseline C (Calibrated LightGBM) | 8.30% | 49.31% | 14.21% | ₹97,718,500.00 |

---
*Report generated automatically by the Sentinel Calibration Pipeline.*

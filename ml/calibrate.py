import os
import json
import csv
import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    precision_score, recall_score, f1_score, 
    confusion_matrix, brier_score_loss, roc_auc_score, 
    precision_recall_curve, auc, roc_curve
)

DATA_DIR = "data_processed"
MODEL_DIR = "models"
ARTIFACTS_DIR = "artifacts"

os.makedirs(ARTIFACTS_DIR, exist_ok=True)
os.makedirs(os.path.join(ARTIFACTS_DIR, "calibrated_model"), exist_ok=True)

def load_costs():
    costs_path = "config/risk_costs.json"
    if os.path.exists(costs_path):
        with open(costs_path, "r") as f:
            return json.load(f)
    return {
        "false_positive_cost": 1500.0,
        "false_negative_cost": 45000.0,
        "manual_review_cost": 500.0,
        "blocked_transaction_cost": 200.0
    }

def run_calibration():
    val_path = os.path.join(DATA_DIR, "val.csv")
    test_path = os.path.join(DATA_DIR, "test.csv")
    model_path = os.path.join(MODEL_DIR, "sentinel_model.lgb")
    schema_path = os.path.join(DATA_DIR, "feature_schema.json")
    
    if not all(os.path.exists(p) for p in [val_path, test_path, model_path, schema_path]):
        raise FileNotFoundError("Prerequisite data or model files not found. Run preprocessing and training first.")
        
    with open(schema_path, "r") as f:
        schema = json.load(f)
    features = schema["features"]
    target = schema["target"]
    
    # Load validation data (Month 5) and test data (Months 6-7)
    print("Loading datasets...")
    val_df = pd.read_csv(val_path)
    test_df = pd.read_csv(test_path)
    
    X_val, y_val = val_df[features], val_df[target]
    X_test, y_test = test_df[features], test_df[target]
    
    print("Loading trained LightGBM booster...")
    booster = lgb.Booster(model_file=model_path)
    
    # Generate raw probabilities
    val_probs_raw = booster.predict(X_val)
    test_probs_raw = booster.predict(X_test)
    
    # 1. Evaluate Calibration & fit Platt Scaling (Logistic Regression) on validation dataset only
    print("Fitting Platt Scaling calibration on validation set...")
    # Reshape for sklearn
    X_calib = val_probs_raw.reshape(-1, 1)
    y_calib = y_val.values
    
    calibrator = LogisticRegression(C=1e5, solver='liblinear')
    calibrator.fit(X_calib, y_calib)
    
    # Save calibrated coefficients
    coef_A = float(calibrator.coef_[0][0])
    coef_B = float(calibrator.intercept_[0])
    print(f"Calibration Parameters: A = {coef_A:.4f}, B = {coef_B:.4f}")
    
    # Apply calibration
    val_probs_cal = calibrator.predict_proba(X_calib)[:, 1]
    test_probs_cal = calibrator.predict_proba(test_probs_raw.reshape(-1, 1))[:, 1]
    
    # Calculate Brier Scores
    brier_raw = brier_score_loss(y_val, val_probs_raw)
    brier_cal = brier_score_loss(y_val, val_probs_cal)
    print(f"Validation Brier Score: Raw = {brier_raw:.5f}, Calibrated = {brier_cal:.5f}")
    
    # Save calibrated parameters
    calibration_report = {
        "brier_score_raw": float(brier_raw),
        "brier_score_calibrated": float(brier_cal),
        "coefficients": {
            "A": coef_A,
            "B": coef_B
        },
        "description": "Platt Scaling Logistic regression fit on Month 5 validation predictions."
    }
    
    with open(os.path.join(ARTIFACTS_DIR, "calibration_report.json"), "w") as f:
        json.dump(calibration_report, f, indent=2)
        
    with open(os.path.join(MODEL_DIR, "calibration_metadata.json"), "w") as f:
        json.dump(calibration_report, f, indent=2)
        
    # 2. Threshold Sweep & Cost Optimization on Validation Set
    costs = load_costs()
    thresholds = [0.01, 0.02, 0.03, 0.05, 0.08, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50]
    
    threshold_analysis = []
    
    print("Performing threshold sweep and business cost optimization on Validation set...")
    for th in thresholds:
        # Evaluate metrics
        preds = (val_probs_cal >= th).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_val, preds).ravel()
        
        prec = precision_score(y_val, preds, zero_division=0)
        rec = recall_score(y_val, preds, zero_division=0)
        f1 = f1_score(y_val, preds, zero_division=0)
        
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        fnr = fn / (fn + tp) if (fn + tp) > 0 else 0.0
        
        # Calculate Expected loss
        fp_cost = fp * costs["false_positive_cost"]
        fn_cost = fn * costs["false_negative_cost"]
        # Review cost: assume items flagged above threshold get reviewed
        # If th is very high, less is reviewed. Let's assume manual review is triggered for all flagged items
        review_cost = (fp + tp) * costs["manual_review_cost"]
        expected_loss = fp_cost + fn_cost + review_cost
        
        threshold_analysis.append({
            "threshold": th,
            "precision": float(prec),
            "recall": float(rec),
            "f1_score": float(f1),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp),
            "true_negatives": int(tn),
            "false_positive_rate": float(fpr),
            "false_negative_rate": float(fnr),
            "fp_cost": float(fp_cost),
            "fn_cost": float(fn_cost),
            "review_cost": float(review_cost),
            "expected_loss": float(expected_loss)
        })
        
    # Save threshold sweeps
    with open(os.path.join(ARTIFACTS_DIR, "threshold_analysis.json"), "w") as f:
        json.dump(threshold_analysis, f, indent=2)
        
    # Write CSV
    csv_path = os.path.join(ARTIFACTS_DIR, "threshold_analysis.csv")
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=threshold_analysis[0].keys())
        writer.writeheader()
        writer.writerows(threshold_analysis)
        
    # Find recommended thresholds for Monitor, Review, Protect
    # Review: minimizes validation expected loss
    recommended_review_th = min(threshold_analysis, key=lambda x: x["expected_loss"])["threshold"]
    # Monitor: low threshold for high recall (e.g. at least 95% recall or lowest expected loss above 0.01)
    recommended_monitor_th = 0.02
    # Protect: high precision threshold (e.g. precision > 50% or standard th + 0.15)
    recommended_protect_th = 0.20
    
    print(f"Recommended Thresholds: Monitor = {recommended_monitor_th}, Review = {recommended_review_th}, Protect = {recommended_protect_th}")
    
    # 3. Final untouched Test Set Evaluation (Months 6-7) at Recommended Review Threshold
    print("Evaluating final test set metrics...")
    test_preds = (test_probs_cal >= recommended_review_th).astype(int)
    test_tn, test_fp, test_fn, test_tp = confusion_matrix(y_test, test_preds).ravel()
    
    test_prec = precision_score(y_test, test_preds, zero_division=0)
    test_rec = recall_score(y_test, test_preds, zero_division=0)
    test_f1 = f1_score(y_test, test_preds, zero_division=0)
    test_fpr = test_fp / (test_fp + test_tn) if (test_fp + test_tn) > 0 else 0.0
    test_fnr = test_fn / (test_fn + test_tp) if (test_fn + test_tp) > 0 else 0.0
    
    # Calc AUC metrics on test set
    fpr_roc, tpr_roc, _ = roc_curve_data = roc_curve_eval = roc_curve_score_dummy = roc_curve(y_test, test_probs_cal)
    test_roc_auc = roc_auc_score(y_test, test_probs_cal)
    
    precision_curve, recall_curve, _ = precision_recall_curve(y_test, test_probs_cal)
    test_pr_auc = auc(recall_curve, precision_curve)
    
    test_fp_cost = test_fp * costs["false_positive_cost"]
    test_fn_cost = test_fn * costs["false_negative_cost"]
    test_review_cost = (test_fp + test_tp) * costs["manual_review_cost"]
    test_expected_loss = test_fp_cost + test_fn_cost + test_review_cost
    
    # 4. Compare Baselines on Test Set
    # Baseline A: Always predict Legitimate (majority class)
    base_a_preds = np.zeros_like(y_test)
    base_a_tn, base_a_fp, base_a_fn, base_a_tp = confusion_matrix(y_test, base_a_preds).ravel()
    base_a_prec = precision_score(y_test, base_a_preds, zero_division=0)
    base_a_rec = recall_score(y_test, base_a_preds, zero_division=0)
    base_a_f1 = f1_score(y_test, base_a_preds, zero_division=0)
    base_a_loss = base_a_fn * costs["false_negative_cost"]
    
    # Baseline B: Simple amount rules (if intended_balcon_amount > 20000 -> flag)
    base_b_preds = (test_df["intended_balcon_amount"] > 20000).astype(int)
    base_b_tn, base_b_fp, base_b_fn, base_b_tp = confusion_matrix(y_test, base_b_preds).ravel()
    base_b_prec = precision_score(y_test, base_b_preds, zero_division=0)
    base_b_rec = recall_score(y_test, base_b_preds, zero_division=0)
    base_b_f1 = f1_score(y_test, base_b_preds, zero_division=0)
    base_b_loss = (base_b_fp * costs["false_positive_cost"]) + (base_b_fn * costs["false_negative_cost"]) + ((base_b_fp + base_b_tp) * costs["manual_review_cost"])

    final_evaluation = {
        "dataset_rows": len(y_test),
        "fraud_rate": float(np.sum(y_test == 1) / len(y_test)),
        "temporal_range": {
            "training": "Months 0-4",
            "validation": "Month 5",
            "test": "Months 6-7"
        },
        "operating_thresholds": {
            "monitor": recommended_monitor_th,
            "review": recommended_review_th,
            "protect": recommended_protect_th
        },
        "model_performance_test": {
            "precision": float(test_prec),
            "recall": float(test_rec),
            "f1_score": float(test_f1),
            "roc_auc": float(test_roc_auc),
            "pr_auc": float(test_pr_auc),
            "false_positive_rate": float(test_fpr),
            "false_negative_rate": float(test_fnr),
            "expected_loss": float(test_expected_loss),
            "confusion_matrix": {
                "tp": int(test_tp),
                "fp": int(test_fp),
                "tn": int(test_tn),
                "fn": int(test_fn)
            }
        },
        "baselines_comparison": {
            "baseline_a_majority_class": {
                "precision": float(base_a_prec),
                "recall": float(base_a_rec),
                "f1_score": float(base_a_f1),
                "expected_loss": float(base_a_loss)
            },
            "baseline_b_amount_rules": {
                "precision": float(base_b_prec),
                "recall": float(base_b_rec),
                "f1_score": float(base_b_f1),
                "expected_loss": float(base_b_loss)
            },
            "baseline_c_calibrated_lgb": {
                "precision": float(test_prec),
                "recall": float(test_rec),
                "f1_score": float(test_f1),
                "expected_loss": float(test_expected_loss)
            }
        }
    }
    
    # Save final evaluation report
    with open(os.path.join(ARTIFACTS_DIR, "final_evaluation.json"), "w") as f:
        json.dump(final_evaluation, f, indent=2)
        
    with open(os.path.join(MODEL_DIR, "final_evaluation_metrics.json"), "w") as f:
        json.dump(final_evaluation, f, indent=2)
        
    # Generate final_evaluation.md report
    md_content = f"""# Sentinel Model Calibration & Final Evaluation Report

This report summarizes the final temporal test evaluation (Months 6-7) of the calibrated LightGBM classifier against major baseline rules.

## Temporal Split Setup
*   **Training Set**: Months 0-4 (675,666 transactions)
*   **Validation Set**: Month 5 (119,323 transactions)
*   **Test Set**: Months 6-7 (205,011 transactions, fully untouched until evaluation)

## Headline Performance Metrics (At Calibrated Review Threshold {recommended_review_th})
*   **Precision**: {test_prec * 100:.2f}%
*   **Recall (Fraud Capture)**: {test_rec * 100:.2f}%
*   **F1 Score**: {test_f1 * 100:.2f}%
*   **PR-AUC (Area Under Precision-Recall Curve)**: {test_pr_auc:.4f}
*   **ROC-AUC**: {test_roc_auc:.4f}
*   **Expected Operational Loss**: ₹{test_expected_loss:,.2f}

## Confusion Matrix (Test Set)
*   **True Positives (TP)**: {test_tp}
*   **False Positives (FP)**: {test_fp}
*   **True Negatives (TN)**: {test_tn}
*   **False Negatives (FN)**: {test_fn}

## Baseline Performance Comparison
| Model / Strategy | Precision | Recall | F1 Score | Expected Operational Loss |
| :--- | :---: | :---: | :---: | :---: |
| Baseline A (Predict Legitimate) | {base_a_prec * 100:.2f}% | {base_a_rec * 100:.2f}% | {base_a_f1 * 100:.2f}% | ₹{base_a_loss:,.2f} |
| Baseline B (Amount Rules) | {base_b_prec * 100:.2f}% | {base_b_rec * 100:.2f}% | {base_b_f1 * 100:.2f}% | ₹{base_b_loss:,.2f} |
| Baseline C (Calibrated LightGBM) | {test_prec * 100:.2f}% | {test_rec * 100:.2f}% | {test_f1 * 100:.2f}% | ₹{test_expected_loss:,.2f} |

---
*Report generated automatically by the Sentinel Calibration Pipeline.*
"""
    with open(os.path.join(ARTIFACTS_DIR, "final_evaluation.md"), "w") as f:
        f.write(md_content)
    print("Saved evaluation documents to artifacts.")

if __name__ == "__main__":
    run_calibration()

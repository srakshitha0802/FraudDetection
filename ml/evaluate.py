import os
import json
import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.metrics import (
    precision_recall_curve, roc_curve, auc, 
    precision_score, recall_score, f1_score, 
    confusion_matrix, log_loss
)

DATA_DIR = "data_processed"
MODEL_DIR = "models"

def run_evaluation():
    test_path = os.path.join(DATA_DIR, "test.csv")
    model_path = os.path.join(MODEL_DIR, "sentinel_model.lgb")
    schema_path = os.path.join(DATA_DIR, "feature_schema.json")
    
    if not os.path.exists(test_path) or not os.path.exists(model_path):
        raise FileNotFoundError("Preprocessed test dataset or model not found. Please run preprocessing.py and train.py first.")
        
    with open(schema_path, "r") as f:
        schema = json.load(f)
        
    features = schema["features"]
    target = schema["target"]
    
    print("Loading test dataset...")
    test_df = pd.read_csv(test_path)
    X_test = test_df[features]
    y_test = test_df[target]
    
    print(f"Test shape: {X_test.shape}")
    print(f"Test class distribution: {np.bincount(y_test)}")
    
    print("Loading model and generating predictions...")
    model = lgb.Booster(model_file=model_path)
    y_prob = model.predict(X_test)
    
    # 1. Base metrics (at default threshold 0.5)
    y_pred = (y_prob >= 0.5).astype(int)
    
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    
    fpr_list, tpr_list, roc_thresholds = roc_curve(y_test, y_prob)
    roc_auc = auc(fpr_list, tpr_list)
    
    p_curve, r_curve, pr_thresholds = precision_recall_curve(y_test, y_prob)
    pr_auc = auc(r_curve, p_curve)
    
    loss = log_loss(y_test, y_prob)
    
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
    fnr = fn / (fn + tp) if (fn + tp) > 0 else 0
    
    accuracy = (tp + tn) / (tp + tn + fp + fn)
    fraud_capture_rate = recall # Fraction of actual fraud captured
    
    print(f"Evaluation results at 0.5 threshold:")
    print(f"  Accuracy:  {accuracy:.4f}")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall:    {recall:.4f}")
    print(f"  F1 Score:  {f1:.4f}")
    print(f"  ROC-AUC:   {roc_auc:.4f}")
    print(f"  PR-AUC:    {pr_auc:.4f}")
    print(f"  FPR:       {fpr:.4f}")
    print(f"  FNR:       {fnr:.4f}")
    
    # 2. Threshold Performance Comparisons (0.30 to 0.90)
    thresholds = [0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90]
    threshold_metrics = []
    
    # Business cost model parameters (configurable)
    # Assume FP cost is ₹1,000 (manual investigation & user friction)
    # Assume FN cost is ₹50,000 (average chargeback loss of undetected fraud)
    fp_cost_multiplier = 1000.0
    fn_cost_multiplier = 50000.0
    
    for th in thresholds:
        th_pred = (y_prob >= th).astype(int)
        th_tn, th_fp, th_fn, th_tp = confusion_matrix(y_test, th_pred).ravel()
        
        th_prec = precision_score(y_test, th_pred, zero_division=0)
        th_rec = recall_score(y_test, th_pred, zero_division=0)
        th_f1 = f1_score(y_test, th_pred, zero_division=0)
        
        th_fpr = th_fp / (th_fp + th_tn) if (th_fp + th_tn) > 0 else 0
        th_fnr = th_fn / (th_fn + th_tp) if (th_fn + th_tp) > 0 else 0
        
        # Calculate Expected Business Operational Loss
        op_loss = (th_fp * fp_cost_multiplier) + (th_fn * fn_cost_multiplier)
        
        threshold_metrics.append({
            "threshold": th,
            "precision": float(th_prec),
            "recall": float(th_rec),
            "f1_score": float(th_f1),
            "false_positives": int(th_fp),
            "false_negatives": int(th_fn),
            "true_positives": int(th_tp),
            "true_negatives": int(th_tn),
            "false_positive_rate": float(th_fpr),
            "false_negative_rate": float(th_fnr),
            "operational_loss": float(op_loss)
        })
        
    report = {
        "dataset_size": len(y_test),
        "fraud_cases": int(np.sum(y_test == 1)),
        "legitimate_cases": int(np.sum(y_test == 0)),
        "global_metrics": {
            "accuracy": float(accuracy),
            "precision": float(precision),
            "recall": float(recall),
            "f1_score": float(f1),
            "roc_auc": float(roc_auc),
            "pr_auc": float(pr_auc),
            "log_loss": float(loss),
            "false_positive_rate": float(fpr),
            "false_negative_rate": float(fnr),
            "fraud_capture_rate": float(fraud_capture_rate)
        },
        "confusion_matrix": {
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp)
        },
        "threshold_comparisons": threshold_metrics,
        "business_cost_model": {
            "false_positive_unit_cost": fp_cost_multiplier,
            "false_negative_unit_cost": fn_cost_multiplier
        }
    }
    
    report_path = os.path.join(MODEL_DIR, "evaluation_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Saved evaluation report to {report_path}")

if __name__ == "__main__":
    run_evaluation()

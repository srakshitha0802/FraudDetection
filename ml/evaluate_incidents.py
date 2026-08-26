import os
import json
import numpy as np

ARTIFACTS_DIR = "artifacts"
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

def evaluate_incident_detection():
    print("Running incident detection evaluator...")
    
    # Simulating 200 temporal transaction windows (100 Normal, 100 Spike)
    np.random.seed(42)
    
    normal_windows = []
    spike_windows = []
    
    # Normal windows: avg fraud rate 1.5% with std dev 0.5%
    for _ in range(100):
        total_tx = int(np.random.normal(500, 50))
        fraud_tx = int(np.random.binomial(total_tx, 0.015))
        normal_windows.append({"total": total_tx, "fraud": fraud_tx, "label": "NORMAL"})
        
    # Spike windows: avg fraud rate jumps to 12.5%
    for _ in range(100):
        total_tx = int(np.random.normal(500, 50))
        # Sudden fraud surge
        fraud_tx = int(np.random.binomial(total_tx, 0.125))
        spike_windows.append({"total": total_tx, "fraud": fraud_tx, "label": "FRAUD_SPIKE"})
        
    # Evaluation pipeline
    historical_baseline_rate = 0.015
    historical_std_dev = 0.005
    
    tp, fp, tn, fn = 0, 0, 0, 0
    latencies = []
    
    # Process Normal
    for w in normal_windows:
        rate = w["fraud"] / w["total"]
        z_score = (rate - historical_baseline_rate) / historical_std_dev
        
        # Detection threshold: z_score >= 3.0
        if z_score >= 3.0:
            fp += 1 # False Alarm
        else:
            tn += 1
            
    # Process Spikes
    for i, w in enumerate(spike_windows):
        rate = w["fraud"] / w["total"]
        z_score = (rate - historical_baseline_rate) / historical_std_dev
        
        if z_score >= 3.0:
            tp += 1
            # Latency simulation: detection occurs between 10 to 45 seconds under load
            latency = float(np.random.normal(32, 8))
            latencies.append(latency)
        else:
            fn += 1 # Missed Event
            
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    false_alarm_rate = fp / (fp + tn) if (fp + tn) > 0 else 0
    mean_detection_latency = np.mean(latencies) if len(latencies) > 0 else 0.0
    
    print(f"Incident Evaluation Complete:")
    print(f"  Spike Detection Precision: {precision * 100:.2f}%")
    print(f"  Spike Detection Recall:    {recall * 100:.2f}%")
    print(f"  False Alarm Rate:          {false_alarm_rate * 100:.2f}%")
    print(f"  Mean Detection Latency:    {mean_detection_latency:.2f} seconds")
    
    incident_eval = {
        "metrics": {
            "spike_precision": float(precision),
            "spike_recall": float(recall),
            "false_alarm_rate": float(false_alarm_rate),
            "mean_detection_latency_seconds": float(mean_detection_latency),
            "events_missed": int(fn),
            "confusion_matrix": {
                "tp": int(tp),
                "fp": int(fp),
                "tn": int(tn),
                "fn": int(fn)
            }
        },
        "parameters": {
            "z_score_threshold": 3.0,
            "baseline_fraud_rate": historical_baseline_rate,
            "baseline_std_dev": historical_std_dev
        }
    }
    
    report_path = os.path.join(ARTIFACTS_DIR, "incident_evaluation.json")
    with open(report_path, "w") as f:
        json.dump(incident_eval, f, indent=2)
    print(f"Saved incident evaluation to {report_path}")

if __name__ == "__main__":
    evaluate_incident_detection()

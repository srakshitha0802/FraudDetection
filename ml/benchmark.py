import os
import time
import json
import numpy as np
import lightgbm as lgb
import pandas as pd

DATA_DIR = "data_processed"
MODEL_DIR = "models"

def run_benchmark():
    model_path = os.path.join(MODEL_DIR, "sentinel_model.lgb")
    schema_path = os.path.join(DATA_DIR, "feature_schema.json")
    test_path = os.path.join(DATA_DIR, "test.csv")
    
    if not os.path.exists(model_path) or not os.path.exists(schema_path):
        raise FileNotFoundError("Model or feature schema not found. Please train the model first.")
        
    with open(schema_path, "r") as f:
        schema = json.load(f)
        
    features = schema["features"]
    
    # Load model once
    print("Loading model for benchmarking...")
    model = lgb.Booster(model_file=model_path)
    
    # Get a sample transaction
    if os.path.exists(test_path):
        test_df = pd.read_csv(test_path, nrows=100)
        samples = test_df[features].values
    else:
        # Fallback to random features matching size
        samples = np.random.rand(100, len(features))
        
    print("Running benchmarking runs...")
    latencies_ms = []
    
    # Warmup runs
    for _ in range(50):
        model.predict(samples[[0]])
        
    # Benchmark runs
    n_runs = 2000
    for i in range(n_runs):
        idx = i % len(samples)
        sample = samples[[idx]]
        
        start_time = time.perf_counter()
        model.predict(sample)
        end_time = time.perf_counter()
        
        latencies_ms.append((end_time - start_time) * 1000.0) # convert to ms
        
    avg_latency = np.mean(latencies_ms)
    p50_latency = np.percentile(latencies_ms, 50)
    p90_latency = np.percentile(latencies_ms, 90)
    p95_latency = np.percentile(latencies_ms, 95)
    p99_latency = np.percentile(latencies_ms, 99)
    
    print(f"Latency Benchmark Results ({n_runs} requests):")
    print(f"  Average: {avg_latency:.4f} ms")
    print(f"  50th Percentile (p50): {p50_latency:.4f} ms")
    print(f"  90th Percentile (p90): {p90_latency:.4f} ms")
    print(f"  95th Percentile (p95): {p95_latency:.4f} ms")
    print(f"  99th Percentile (p99): {p99_latency:.4f} ms")
    
    benchmark_report = {
        "n_requests": n_runs,
        "average_latency_ms": float(avg_latency),
        "p50_latency_ms": float(p50_latency),
        "p90_latency_ms": float(p90_latency),
        "p95_latency_ms": float(p95_latency),
        "p99_latency_ms": float(p99_latency)
    }
    
    benchmark_path = os.path.join(MODEL_DIR, "benchmark.json")
    with open(benchmark_path, "w") as f:
        json.dump(benchmark_report, f, indent=2)
    print(f"Saved benchmark results to {benchmark_path}")

if __name__ == "__main__":
    run_benchmark()

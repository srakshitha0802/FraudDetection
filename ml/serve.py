import os
import json
import time
import numpy as np
import lightgbm as lgb
from fastapi import FastAPI, HTTPException, Request, Response
from pydantic import BaseModel

MODEL_DIR = "models"
DATA_DIR = "data_processed"

app = FastAPI(title="Sentinel ML Inference Service", version="1.0.0")

# Telemetry registries
request_count = 0
error_count = 0
inference_count = 0
inference_latency_sum = 0.0

# Global model state
model = None
features = []
categorical_features = []
categorical_mappings = {}
coef_A = 7.6371
coef_B = -5.6923
artifacts_loaded = False

@app.on_event("startup")
def startup_event():
    global model, features, categorical_features, categorical_mappings, coef_A, coef_B, artifacts_loaded
    model_path = os.path.join(MODEL_DIR, "sentinel_model.lgb")
    schema_path = os.path.join(DATA_DIR, "feature_schema.json")
    meta_path = os.path.join(DATA_DIR, "preprocessing_metadata.json")
    calib_path = os.path.join(MODEL_DIR, "calibration_metadata.json")
    fallback_calib_path = os.path.join("artifacts", "calibration_report.json")
    
    # 1. Load calibration parameters
    active_calib_path = calib_path if os.path.exists(calib_path) else (fallback_calib_path if os.path.exists(fallback_calib_path) else None)
    if active_calib_path:
        try:
            with open(active_calib_path, "r") as f:
                calib = json.load(f)
                # Handle coefficients format differences
                if "coefficients" in calib:
                    coef_A = calib["coefficients"]["A"]
                    coef_B = calib["coefficients"]["B"]
                elif "A" in calib:
                    coef_A = calib["A"]
                    coef_B = calib["B"]
                print(f"Loaded calibration parameters: A={coef_A}, B={coef_B}")
        except Exception as e:
            print(f"Error loading calibration parameters: {e}")
            # Do not fail completely if coef defaults exist, but flag loading error
            
    # 2. Verify model file exists
    if not os.path.exists(model_path):
        print(f"CRITICAL: Model file {model_path} not found.")
        return
        
    try:
        model = lgb.Booster(model_file=model_path)
        print(f"LightGBM model loaded successfully from {model_path}")
    except Exception as e:
        print(f"CRITICAL: Error loading LightGBM model: {e}")
        return
        
    # 3. Load feature schema
    if os.path.exists(schema_path):
        try:
            with open(schema_path, "r") as f:
                schema = json.load(f)
                features = schema["features"]
                categorical_features = schema["categorical_features"]
                print(f"Feature schema loaded: {len(features)} features")
        except Exception as e:
            print(f"CRITICAL: Error parsing feature schema: {e}")
            return
    else:
        print(f"CRITICAL: Feature schema {schema_path} missing.")
        return
            
    # 4. Load metadata
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r") as f:
                meta = json.load(f)
                categorical_mappings = meta.get("categorical_mappings", {})
                print("Categorical mappings loaded")
        except Exception as e:
            print(f"CRITICAL: Error parsing metadata: {e}")
            return
            
    artifacts_loaded = True

class PredictionRequest(BaseModel):
    features: dict

@app.middleware("http")
async def telemetry_middleware(request: Request, call_next):
    global request_count, error_count
    request_count += 1
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        error_count += 1
        raise e

@app.post("/predict")
def predict(request: PredictionRequest):
    global model, features, categorical_features, categorical_mappings, inference_count, inference_latency_sum
    if not artifacts_loaded or model is None:
        raise HTTPException(status_code=503, detail="Model service is currently unavailable or uninitialized.")
        
    try:
        start_time = time.time()
        
        # Construct feature vector
        feat_dict = request.features
        vector = []
        for feat in features:
            val = feat_dict.get(feat, None)
            
            # Map categorical values to integers
            if feat in categorical_features:
                mapping = categorical_mappings.get(feat, {})
                if val is None:
                    val = mapping.get("UNKNOWN", 0)
                elif isinstance(val, str):
                    val = mapping.get(val, mapping.get("UNKNOWN", 0))
            else:
                # Numerical columns
                if val is None:
                    val = -1.0 # Default missing value representation in BAF dataset
                else:
                    val = float(val)
            vector.append(val)
            
        # Reshape for prediction
        x = np.array([vector])
        prob = model.predict(x)[0]
        cal_prob = 1.0 / (1.0 + np.exp(-(coef_A * float(prob) + coef_B)))
        
        duration = (time.time() - start_time) * 1000.0 # to ms
        inference_count += 1
        inference_latency_sum += duration
        
        return {
            "fraud_probability": float(prob),
            "calibrated_probability": float(cal_prob),
            "model_version": "v3.0-lightgbm",
            "status": "active"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/ready")
def ready(response: Response):
    global model, artifacts_loaded
    if artifacts_loaded and model is not None:
        return {
            "status": "ready",
            "model_loaded": True,
            "features_count": len(features)
        }
    else:
        response.status_code = 503
        return {
            "status": "not_ready",
            "reason": "Model artifacts failed loading at startup"
        }

@app.get("/metrics")
def metrics():
    global request_count, error_count, inference_count, inference_latency_sum
    avg_latency = (inference_latency_sum / inference_count) if inference_count > 0 else 0.0
    return {
        "request_count": request_count,
        "error_count": error_count,
        "inference_count": inference_count,
        "average_inference_latency_ms": avg_latency
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

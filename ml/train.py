import os
import json
import pandas as pd
import numpy as np
import lightgbm as lgb
import joblib

DATA_DIR = "data_processed"
MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)

def run_training():
    train_path = os.path.join(DATA_DIR, "train.csv")
    val_path = os.path.join(DATA_DIR, "val.csv")
    schema_path = os.path.join(DATA_DIR, "feature_schema.json")
    
    if not os.path.exists(train_path) or not os.path.exists(val_path):
        raise FileNotFoundError("Preprocessed train/val datasets not found. Please run preprocessing.py first.")
        
    with open(schema_path, "r") as f:
        schema = json.load(f)
        
    features = schema["features"]
    target = schema["target"]
    categorical_features = schema["categorical_features"]
    
    print("Loading training dataset...")
    train_df = pd.read_csv(train_path)
    X_train = train_df[features]
    y_train = train_df[target]
    
    print("Loading validation dataset...")
    val_df = pd.read_csv(val_path)
    X_val = val_df[features]
    y_val = val_df[target]
    
    print(f"Training shapes: {X_train.shape}, Validation shapes: {X_val.shape}")
    print(f"Train fraud distribution: {np.bincount(y_train)}")
    print(f"Val fraud distribution: {np.bincount(y_val)}")
    
    # Calculate scale_pos_weight to handle class imbalance
    neg_count = np.sum(y_train == 0)
    pos_count = np.sum(y_train == 1)
    scale_pos_weight = neg_count / pos_count if pos_count > 0 else 1.0
    print(f"Class imbalance multiplier (scale_pos_weight): {scale_pos_weight:.2f}")
    
    # Prepare LightGBM datasets
    train_data = lgb.Dataset(X_train, label=y_train, categorical_feature=categorical_features)
    val_data = lgb.Dataset(X_val, label=y_val, reference=train_data, categorical_feature=categorical_features)
    
    params = {
        "objective": "binary",
        "metric": "binary_logloss",
        "boosting_type": "gbdt",
        "learning_rate": 0.05,
        "num_leaves": 31,
        "max_depth": 6,
        "scale_pos_weight": scale_pos_weight,
        "verbosity": -1,
        "random_state": 42
    }
    
    print("Training LightGBM model...")
    evals_result = {}
    
    # Simple logger callback
    class LogCallback:
        def __call__(self, env):
            if env.iteration % 10 == 0 or env.iteration == env.end_iteration - 1:
                log_loss = env.evaluation_result_list[0][2]
                print(f"Epoch {env.iteration}: Validation logloss = {log_loss:.5f}")

    model = lgb.train(
        params,
        train_data,
        num_boost_round=100,
        valid_sets=[val_data],
        callbacks=[
            lgb.early_stopping(stopping_rounds=15),
            LogCallback()
        ]
    )
    
    # Save the model
    model_path = os.path.join(MODEL_DIR, "sentinel_model.lgb")
    model.save_model(model_path)
    print(f"Model saved to {model_path}")
    
    # Save metadata
    training_metadata = {
        "model_path": model_path,
        "num_features": len(features),
        "scale_pos_weight": scale_pos_weight,
        "trained_epochs": model.best_iteration
    }
    meta_path = os.path.join(MODEL_DIR, "model_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(training_metadata, f, indent=2)
    print(f"Saved model training metadata to {meta_path}")

if __name__ == "__main__":
    run_training()

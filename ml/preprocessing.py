import os
import json
import pandas as pd
import numpy as np

# Config
DATA_DIR = "archive 2"
OUTPUT_DIR = "data_processed"
os.makedirs(OUTPUT_DIR, exist_ok=True)

CATEGORICAL_COLS = [
    "payment_type",
    "employment_status",
    "housing_status",
    "source",
    "device_os"
]

TARGET_COL = "fraud_bool"

# We will read Base.csv and load in chunks.
# To simulate the full dataset, we can use Base.csv (1M rows).
INPUT_FILE = os.path.join(DATA_DIR, "Base.csv")

def build_categorical_mappings(filepath):
    print("Building categorical mappings...")
    mappings = {}
    for col in CATEGORICAL_COLS:
        mappings[col] = {}
        
    # Read unique values from the dataset in chunks to avoid memory spikes
    chunksize = 100000
    for chunk in pd.read_csv(filepath, usecols=CATEGORICAL_COLS, chunksize=chunksize):
        for col in CATEGORICAL_COLS:
            uniques = chunk[col].dropna().unique()
            for val in uniques:
                if val not in mappings[col]:
                    mappings[col][val] = len(mappings[col])
                    
    # Add an 'unknown' category for unseen categories at inference time
    for col in CATEGORICAL_COLS:
        mappings[col]["UNKNOWN"] = len(mappings[col])
        
    return mappings

def preprocess_chunk(chunk, mappings):
    # 1. Clean duplicate transactions
    # (Assuming we drop duplicates in each chunk or overall. In real-time streams we drop exact duplicate payloads)
    chunk = chunk.drop_duplicates()
    
    # 2. Encode categoricals using built mappings
    for col in CATEGORICAL_COLS:
        mapping = mappings[col]
        # Map values. If unseen, map to UNKNOWN
        chunk[col] = chunk[col].map(lambda x: mapping.get(x, mapping["UNKNOWN"]))
        
    # 3. Optimize numerical datatypes
    for col in chunk.columns:
        if col == TARGET_COL:
            chunk[col] = chunk[col].astype(np.int8)
        elif chunk[col].dtype == np.float64:
            chunk[col] = chunk[col].astype(np.float32)
        elif chunk[col].dtype == np.int64:
            # check range
            max_val = chunk[col].max()
            if max_val < 128:
                chunk[col] = chunk[col].astype(np.int8)
            elif max_val < 32768:
                chunk[col] = chunk[col].astype(np.int16)
            else:
                chunk[col] = chunk[col].astype(np.int32)
                
    return chunk

def run_preprocessing():
    if not os.path.exists(INPUT_FILE):
        raise FileNotFoundError(f"Dataset file {INPUT_FILE} not found. Please place the NeurIPS BAF dataset CSVs in 'archive 2/'.")
        
    mappings = build_categorical_mappings(INPUT_FILE)
    
    # Save mappings metadata
    meta_path = os.path.join(OUTPUT_DIR, "preprocessing_metadata.json")
    with open(meta_path, "w") as f:
        json.dump({"categorical_mappings": mappings}, f, indent=2)
    print(f"Saved preprocessing metadata to {meta_path}")
    
    # Initialize output file handles
    train_file = os.path.join(OUTPUT_DIR, "train.csv")
    val_file = os.path.join(OUTPUT_DIR, "val.csv")
    test_file = os.path.join(OUTPUT_DIR, "test.csv")
    
    # Clear existing outputs
    for f in [train_file, val_file, test_file]:
        if os.path.exists(f):
            os.remove(f)
            
    chunksize = 100000
    print(f"Processing dataset from {INPUT_FILE} in chunks of {chunksize}...")
    
    feature_schema = []
    first_chunk = True
    
    total_rows = 0
    train_rows = 0
    val_rows = 0
    test_rows = 0
    
    for chunk in pd.read_csv(INPUT_FILE, chunksize=chunksize):
        processed = preprocess_chunk(chunk, mappings)
        total_rows += len(processed)
        
        if first_chunk:
            # Capture schema (all columns except target)
            feature_schema = [col for col in processed.columns if col != TARGET_COL]
            schema_path = os.path.join(OUTPUT_DIR, "feature_schema.json")
            with open(schema_path, "w") as f:
                json.dump({"features": feature_schema, "categorical_features": CATEGORICAL_COLS, "target": TARGET_COL}, f, indent=2)
            print(f"Saved feature schema to {schema_path}")
            first_chunk = False
            
        # Split temporally based on 'month' column
        # NeurIPS BAF months: 0-7. Train: 0-4, Val: 5, Test: 6-7
        train_chunk = processed[processed["month"] <= 4]
        val_chunk = processed[processed["month"] == 5]
        test_chunk = processed[processed["month"] >= 6]
        
        train_rows += len(train_chunk)
        val_rows += len(val_chunk)
        test_rows += len(test_chunk)
        
        # Write chunks (append mode)
        if len(train_chunk) > 0:
            train_chunk.to_csv(train_file, mode='a', index=False, header=not os.path.exists(train_file))
        if len(val_chunk) > 0:
            val_chunk.to_csv(val_file, mode='a', index=False, header=not os.path.exists(val_file))
        if len(test_chunk) > 0:
            test_chunk.to_csv(test_file, mode='a', index=False, header=not os.path.exists(test_file))
            
    print(f"Preprocessing completed. Total rows: {total_rows}")
    print(f"Train split rows (Months 0-4): {train_rows} ({train_rows/total_rows*100:.1f}%)")
    print(f"Validation split rows (Month 5): {val_rows} ({val_rows/total_rows*100:.1f}%)")
    print(f"Test split rows (Months 6-7): {test_rows} ({test_rows/total_rows*100:.1f}%)")
    
if __name__ == "__main__":
    run_preprocessing()

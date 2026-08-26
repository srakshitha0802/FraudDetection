-- 005_model_metadata.sql
-- Create model metadata and baseline tables

CREATE TABLE IF NOT EXISTS model_versions (
  model_version TEXT PRIMARY KEY,
  model_type TEXT,
  features TEXT,
  calibration_a REAL,
  calibration_b REAL,
  status TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS model_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_version TEXT,
  metric_name TEXT,
  metric_value REAL,
  recorded_at TEXT,
  FOREIGN KEY(model_version) REFERENCES model_versions(model_version) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS merchant_baselines (
  merchant_id TEXT PRIMARY KEY,
  transaction_rate_baseline REAL,
  risk_rate_baseline REAL,
  amount_baseline_avg REAL,
  amount_baseline_std REAL
);

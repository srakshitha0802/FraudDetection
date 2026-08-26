-- 002_constraints.sql
-- Setup secondary tables with foreign key constraints

CREATE TABLE IF NOT EXISTS risk_scores (
  transaction_id TEXT PRIMARY KEY,
  final_risk_score INTEGER,
  risk_level TEXT,
  decision TEXT,
  ml_probability REAL,
  rule_score REAL,
  anomaly_score REAL,
  device_score REAL,
  velocity_score REAL,
  FOREIGN KEY(transaction_id) REFERENCES transactions(transaction_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS incidents (
  incident_id TEXT PRIMARY KEY,
  severity TEXT,
  type TEXT,
  status TEXT,
  exposure_amount REAL,
  confidence_score REAL,
  created_at TEXT,
  resolved_at TEXT,
  resolution_reason TEXT,
  incident_score REAL,
  first_seen TEXT,
  last_seen TEXT,
  affected_transactions INTEGER,
  affected_users INTEGER,
  evidence TEXT
);

CREATE TABLE IF NOT EXISTS incident_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_id TEXT,
  entity_type TEXT,
  entity_value TEXT,
  FOREIGN KEY(incident_id) REFERENCES incidents(incident_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS risk_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT,
  signal_name TEXT,
  signal_value TEXT,
  FOREIGN KEY(transaction_id) REFERENCES transactions(transaction_id) ON DELETE CASCADE
);

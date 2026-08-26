-- 004_audit.sql
-- Create audit, rules, and configuration tracking tables

CREATE TABLE IF NOT EXISTS analyst_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_id TEXT,
  timestamp TEXT,
  analyst_id TEXT,
  action TEXT,
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  FOREIGN KEY(incident_id) REFERENCES incidents(incident_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT,
  incident_id TEXT,
  analyst_id TEXT,
  feedback_type TEXT,
  recorded_at TEXT,
  FOREIGN KEY(transaction_id) REFERENCES transactions(transaction_id) ON DELETE CASCADE,
  FOREIGN KEY(incident_id) REFERENCES incidents(incident_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT,
  actor TEXT,
  action TEXT,
  resource TEXT,
  previous_state TEXT,
  new_state TEXT,
  request_id TEXT
);

CREATE TABLE IF NOT EXISTS custom_rules (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  rule_condition TEXT,
  risk_contribution INTEGER,
  severity TEXT,
  is_active INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS watchlists (
  id TEXT PRIMARY KEY,
  type TEXT,
  value TEXT,
  reason TEXT,
  risk_weight INTEGER,
  added_at TEXT
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  name TEXT,
  prefix TEXT,
  secret_hash TEXT,
  created_at TEXT,
  status TEXT
);

CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  url TEXT,
  secret TEXT,
  events TEXT,
  created_at TEXT,
  status TEXT
);

CREATE TABLE IF NOT EXISTS case_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_id TEXT,
  note TEXT,
  author TEXT,
  created_at TEXT
);

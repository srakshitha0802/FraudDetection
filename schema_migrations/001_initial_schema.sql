-- 001_initial_schema.sql
-- Baseline Sentinel tables setup

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  account_created_at TEXT,
  kyc_status TEXT,
  average_transaction_amount REAL,
  median_transaction_amount REAL,
  std_dev_amount REAL,
  maximum_normal_amount REAL,
  account_status TEXT,
  failed_login_count_24h INTEGER,
  recent_password_reset INTEGER,
  recent_phone_change INTEGER
);

CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,
  device_model TEXT,
  os TEXT,
  browser TEXT,
  ip_address TEXT,
  is_vpn INTEGER,
  is_rooted_or_jailbroken INTEGER,
  is_emulator INTEGER,
  reputation_score REAL,
  first_seen TEXT,
  last_seen TEXT,
  associated_users_count INTEGER
);

CREATE TABLE IF NOT EXISTS beneficiaries (
  beneficiary_id TEXT PRIMARY KEY,
  name TEXT,
  account_or_vpa TEXT,
  bank_name TEXT,
  created_at TEXT,
  is_verified INTEGER,
  risk_score REAL,
  associated_accounts_count INTEGER,
  is_flagged_mule INTEGER
);

CREATE TABLE IF NOT EXISTS transactions (
  transaction_id TEXT PRIMARY KEY,
  user_id TEXT,
  device_id TEXT,
  ip_address TEXT,
  location TEXT,
  amount REAL,
  currency TEXT DEFAULT 'INR',
  payment_type TEXT,
  employment_status TEXT,
  housing_status TEXT,
  merchant_id TEXT,
  merchant_category TEXT,
  timestamp TEXT,
  request_hash TEXT,
  is_fraud_label INTEGER DEFAULT -1,
  FOREIGN KEY(user_id) REFERENCES users(user_id),
  FOREIGN KEY(device_id) REFERENCES devices(device_id)
);

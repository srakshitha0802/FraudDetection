-- 003_indexes.sql
-- Create indices for common transaction, incident, and entity query patterns

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_device ON transactions(device_id);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_req_hash ON transactions(request_hash);

CREATE INDEX IF NOT EXISTS idx_risk_scores_final ON risk_scores(final_risk_score);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incident_entities_id ON incident_entities(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_entities_val ON incident_entities(entity_value);

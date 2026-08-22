export interface Transaction {
  transaction_id: string;
  user_id: string;
  user_name?: string;
  amount: number;
  currency: string;
  merchant_id: string;
  merchant_name?: string;
  merchant_category: 'TRANSFER' | 'SHOPPING' | 'GROCERY' | 'UTILITIES' | 'CRYPTO' | 'TRAVEL' | 'ENTERTAINMENT' | 'GAMBLING';
  timestamp: string;
  transaction_type: 'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'NET_BANKING' | 'WALLET';
  device_id: string;
  device_model?: string;
  ip_address: string;
  location: string;
  beneficiary_id?: string;
  beneficiary_name?: string;
  beneficiary_account?: string;
  status: 'PENDING' | 'APPROVED' | 'VERIFICATION_REQUIRED' | 'HELD' | 'BLOCKED' | 'RESOLVED';
  risk_score?: number;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommended_action?: string;
  policy_decision?: string;
  investigation_id?: string;
  otp_code?: string;
  hold_expires_at?: string;
  case_notes?: { id: string; author: string; text: string; timestamp: string; action?: string }[];
  fir_ack_number?: string;
  sar_ref?: string;
  analyst_attestation?: {
    analyst_name: string;
    action: string;
    timestamp: string;
    notes: string;
  };
}

export interface ForensicChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  toolInvocations?: { tool_name: string; summary: string }[];
}

export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  account_created_at: string;
  kyc_status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  average_transaction_amount: number;
  median_transaction_amount: number;
  std_dev_amount: number;
  maximum_normal_amount: number;
  usual_transaction_times: string[]; // e.g. ["08:00-22:00"]
  usual_locations: string[];
  usual_devices: string[];
  usual_merchants: string[];
  usual_beneficiaries: string[];
  average_daily_transaction_count: number;
  average_daily_transaction_volume: number;
  recent_password_reset: boolean;
  password_reset_timestamp?: string;
  recent_phone_change: boolean;
  phone_change_timestamp?: string;
  failed_login_count_24h: number;
  account_status: 'ACTIVE' | 'FLAGGED' | 'SUSPENDED';
}

export interface DeviceInfo {
  device_id: string;
  device_model: string;
  os: string;
  browser: string;
  ip_address: string;
  is_vpn: boolean;
  is_rooted_or_jailbroken: boolean;
  is_emulator: boolean;
  reputation_score: number; // 0-100 (100 = trusted)
  first_seen: string;
  last_seen: string;
  associated_users_count: number;
  associated_users: string[];
}

export interface BeneficiaryInfo {
  beneficiary_id: string;
  name: string;
  account_or_vpa: string;
  bank_name: string;
  created_at: string;
  is_verified: boolean;
  risk_score: number; // 0-100
  associated_accounts_count: number;
  associated_users: string[];
  is_flagged_mule: boolean;
}

export interface RuleResult {
  rule_id: string;
  rule_name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  risk_contribution: number;
  triggered: boolean;
}

export interface ExtractedFeatures {
  amount: number;
  amount_deviation: number;
  amount_z_score: number;
  amount_to_avg_ratio: number;
  new_device: boolean;
  new_beneficiary: boolean;
  new_location: boolean;
  unusual_time: boolean;
  transaction_velocity_1h: number;
  transaction_velocity_24h: number;
  daily_transaction_count: number;
  daily_transaction_volume: number;
  failed_login_count: number;
  recent_password_change: boolean;
  recent_phone_change: boolean;
  device_risk: number; // 0-100
  location_risk: number; // 0-100
  merchant_risk: number; // 0-100
  beneficiary_risk: number; // 0-100
  is_night_transaction: boolean; // between 01:00 - 05:00
  is_high_risk_category: boolean;
  network_shared_device_count: number;
  network_shared_beneficiary_count: number;
}

export interface MLPrediction {
  fraud_probability: number; // 0.0 - 1.0
  confidence: number;
  model_name: string;
  feature_importances: { feature: string; importance: number; value: number | string | boolean }[];
  model_metrics?: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    roc_auc: number;
  };
}

export interface RiskScoreBreakdown {
  final_risk_score: number; // 0-100
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ml_score_contribution: number;
  rule_risk_contribution: number;
  behavioral_anomaly_score: number;
  device_risk_contribution: number;
  velocity_risk_contribution: number;
  network_risk_multiplier: number;
  thresholds: {
    low: number; // 0-30
    medium: number; // 31-70
    high: number; // 71-100
  };
  reasons: string[];
}

export interface AgentEvidence {
  signal: string;
  value: string | number | boolean;
  description: string;
  severity: 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL';
}

export interface AgentInvestigationRecord {
  investigation_id: string;
  transaction_id: string;
  timestamp: string;
  agent_model: string;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  classification: 'LEGITIMATE' | 'SUSPICIOUS' | 'CONFIRMED_FRAUD' | 'ACCOUNT_TAKEOVER' | 'MULE_NETWORK';
  recommended_action: 'APPROVE' | 'STEP_UP_VERIFICATION' | 'HOLD_AND_VERIFY' | 'BLOCK_AND_ALERT';
  policy_decision: 'APPROVED' | 'STEP_UP_REQUIRED' | 'HELD_FOR_REVIEW' | 'BLOCKED';
  confidence: number;
  reasons: string[];
  evidence: AgentEvidence[];
  investigation_summary: string;
  next_steps: string[];
  tool_invocations: {
    tool_name: string;
    timestamp: string;
    input: Record<string, any>;
    output_summary: string;
  }[];
  policy_check: {
    allowed: boolean;
    policy_rule_applied: string;
    override_reason?: string;
  };
}

export interface FraudAlert {
  alert_id: string;
  transaction_id: string;
  user_id: string;
  user_name: string;
  amount: number;
  currency: string;
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'UNDER_INVESTIGATION' | 'RESOLVED_FRAUD' | 'RESOLVED_FALSE_POSITIVE' | 'BLOCKED';
  risk_score: number;
  triggered_rules_count: number;
  summary: string;
  assigned_to?: string;
}

export interface AuditLog {
  log_id: string;
  timestamp: string;
  action: string;
  actor: 'SYSTEM_RULE_ENGINE' | 'ML_FRAUD_MODEL' | 'AI_INVESTIGATION_AGENT' | 'POLICY_ENGINE' | 'SECURITY_ANALYST';
  transaction_id?: string;
  user_id?: string;
  details: Record<string, any>;
  ip?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'USER' | 'DEVICE' | 'IP' | 'BENEFICIARY' | 'MERCHANT';
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  properties: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: 'USED_DEVICE' | 'USED_IP' | 'SENT_TO_BENEFICIARY' | 'PAID_MERCHANT';
  weight: number;
  is_suspicious: boolean;
}

export interface FraudNetworkGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  suspicious_clusters_count: number;
  flagged_entities_count: number;
}

export interface DynamicCondition {
  field: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains' | 'in';
  value: any;
}

export interface CustomRule {
  rule_id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  action: 'APPROVE' | 'STEP_UP_OTP' | 'HOLD_ESCROW' | 'BLOCK';
  conditions: DynamicCondition[];
  logic: 'AND' | 'OR';
  risk_contribution: number;
  created_at: string;
  last_triggered_count: number;
  tags?: string[];
}

export interface WatchlistItem {
  id: string;
  type: 'VPA' | 'BANK_ACCOUNT' | 'IP' | 'DEVICE_ID' | 'USER_ID' | 'PHONE';
  value: string;
  list_type: 'BLACKLIST' | 'WHITELIST';
  category: 'MULE' | 'FRAUD_SYNDICATE' | 'STOLEN_DEVICE' | 'SANCTIONED_ENTITY' | 'TRUSTED_VIP' | 'WHITELISTED_PARTNER';
  reason: string;
  created_at: string;
  created_by: string;
  hits_count: number;
}

export interface ApiKey {
  key_id: string;
  name: string;
  key_secret: string;
  environment: 'live' | 'test';
  permissions: string[];
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

export interface WebhookSubscription {
  webhook_id: string;
  target_url: string;
  secret_token: string;
  events: string[];
  status: 'ACTIVE' | 'PAUSED' | 'FAILED';
  last_delivery_at: string | null;
  last_status_code: number | null;
  created_at: string;
}

export interface CaseNote {
  note_id: string;
  alert_id: string;
  author: string;
  content: string;
  timestamp: string;
  action_taken?: string;
}

export interface SARReport {
  report_id: string;
  generated_at: string;
  regulatory_filing_ref: string;
  fiu_jurisdiction: string;
  subject_transaction: Transaction;
  user_details: UserProfile | null;
  investigation_summary: string;
  suspected_violation_types: string[];
  total_suspicious_amount: number;
  evidence_matrix: AgentEvidence[];
  analyst_attestation: {
    analyst_name: string;
    filing_status: 'RECOMMENDED_FOR_FIU_TRANSMISSION' | 'INTERNAL_SECURITY_RECORD';
    timestamp: string;
  };
}

export interface BatchIngestResult {
  total_processed: number;
  approved_count: number;
  step_up_count: number;
  held_count: number;
  blocked_count: number;
  total_volume: number;
  flagged_volume: number;
  results: {
    transaction: Transaction;
    risk_score: number;
    decision: string;
    triggered_rules: string[];
  }[];
}

export interface ModelTrainingConfig {
  model_type: 'xgboost' | 'random_forest' | 'isolation_forest' | 'gnn_graph' | 'neural_autoencoder';
  dataset_size: number;
  fraud_ratio: number;
  learning_rate: number;
  max_depth: number;
  n_estimators: number;
  regularization_l2: number;
  test_split: number;
  selected_features: string[];
}

export interface ModelTrainingEpoch {
  epoch: number;
  train_loss: number;
  val_loss: number;
  train_accuracy: number;
  val_accuracy: number;
  f1_score: number;
  roc_auc: number;
}

export interface ModelTrainingResult {
  training_id: string;
  model_name: string;
  model_type: string;
  trained_at: string;
  training_duration_ms: number;
  dataset_samples: number;
  epochs: ModelTrainingEpoch[];
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    roc_auc: number;
    pr_auc: number;
    log_loss: number;
    psi_drift_score: number;
  };
  confusion_matrix: {
    true_positive: number;
    false_positive: number;
    true_negative: number;
    false_negative: number;
  };
  feature_importances: { feature: string; importance: number; description: string; shap_value: number }[];
  model_version: string;
  deployed: boolean;
}

export interface ActiveDeployedModel {
  training_id: string;
  name: string;
  version: string;
  type: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  pr_auc: number;
  log_loss: number;
  psi_drift_score: number;
  deployed_at: string;
}

export interface EmailDispatchRecord {
  id: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  category: 'AUTH_OTP' | 'CRITICAL_FRAUD_ALERT' | 'CARD_BLOCKED' | 'POLICE_COMPLAINT' | 'MODEL_DEPLOYED' | 'TEST_PING' | 'PANIC_KILLSWITCH';
  status: 'DELIVERED' | 'DISPATCHED' | 'FAILED';
  deliveryMode: 'RESEND_API' | 'SMTP_REAL' | 'TRANSACTIONAL_RELAY' | 'LOCAL_SECURE_DISPATCH';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SmsDispatchRecord {
  id: string;
  to: string;
  from: string;
  message: string;
  category: 'AUTH_OTP' | 'CRITICAL_FRAUD_ALERT' | 'CARD_BLOCKED' | 'TEST_PING' | 'PANIC_KILLSWITCH';
  status: 'DELIVERED' | 'DISPATCHED' | 'FAILED' | 'QUEUED';
  deliveryMode: 'TWILIO_API' | 'LOCAL_SECURE_DISPATCH';
  sid?: string;
  error?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}


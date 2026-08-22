import {
  Transaction,
  RiskScoreBreakdown,
  AuditLog
} from './types.ts';
import { db } from './db.ts';

export interface PolicyValidationResult {
  allowed: boolean;
  policy_decision: 'APPROVED' | 'STEP_UP_REQUIRED' | 'HELD_FOR_REVIEW' | 'BLOCKED';
  policy_rule_applied: string;
  reason: string;
  audit_entry: AuditLog;
}

export function enforcePolicy(
  tx: Transaction,
  riskBreakdown: RiskScoreBreakdown,
  agentRecommendation?: string
): PolicyValidationResult {
  const score = riskBreakdown.final_risk_score;
  let policyDecision: 'APPROVED' | 'STEP_UP_REQUIRED' | 'HELD_FOR_REVIEW' | 'BLOCKED';
  let policyRule = '';
  let reason = '';

  // Deterministic Policy Matrix
  if (score >= 95 || riskBreakdown.risk_level === 'CRITICAL') {
    policyDecision = 'BLOCKED';
    policyRule = 'POLICY_CRITICAL_RISK_MANDATORY_BLOCK';
    reason = `Risk Score (${score}/100) exceeds Critical Threshold (>=95). Mandatory block and security alert enforced.`;
  } else if (score >= 71 || riskBreakdown.risk_level === 'HIGH') {
    policyDecision = 'HELD_FOR_REVIEW';
    policyRule = 'POLICY_HIGH_RISK_HOLD_AND_FREEZE';
    reason = `Risk Score (${score}/100) is High. Transaction held in escrow pending step-up biometric/analyst verification.`;
  } else if (score >= 31 || riskBreakdown.risk_level === 'MEDIUM') {
    policyDecision = 'STEP_UP_REQUIRED';
    policyRule = 'POLICY_MEDIUM_RISK_STEP_UP_OTP';
    reason = `Risk Score (${score}/100) is Medium. Out-of-band Step-up OTP or Biometric prompt required.`;
  } else {
    policyDecision = 'APPROVED';
    policyRule = 'POLICY_LOW_RISK_AUTO_APPROVE';
    reason = `Risk Score (${score}/100) is Low. Transaction meets safety policy and is approved immediately.`;
  }

  // Validate agent recommendation against deterministic policy bounds
  let allowed = true;
  if (agentRecommendation === 'APPROVE' && (policyDecision === 'BLOCKED' || policyDecision === 'HELD_FOR_REVIEW')) {
    allowed = false; // Guard: LLM cannot approve a high/critical risk transaction
  }

  // Update transaction status in DB
  const currentTx = db.transactions.get(tx.transaction_id);
  if (currentTx) {
    if (policyDecision === 'APPROVED') currentTx.status = 'APPROVED';
    else if (policyDecision === 'STEP_UP_REQUIRED') currentTx.status = 'VERIFICATION_REQUIRED';
    else if (policyDecision === 'HELD_FOR_REVIEW') currentTx.status = 'HELD';
    else if (policyDecision === 'BLOCKED') currentTx.status = 'BLOCKED';
    currentTx.risk_score = score;
    currentTx.risk_level = riskBreakdown.risk_level;
    currentTx.policy_decision = policyDecision;
    currentTx.recommended_action = agentRecommendation || policyDecision;
  }

  // If High or Critical, generate/update Fraud Alert
  if (score >= 60) {
    const alertId = `ALT_${tx.transaction_id}`;
    db.fraud_alerts.set(alertId, {
      alert_id: alertId,
      transaction_id: tx.transaction_id,
      user_id: tx.user_id,
      user_name: tx.user_name || 'User ' + tx.user_id,
      amount: tx.amount,
      currency: tx.currency || 'INR',
      timestamp: tx.timestamp || new Date().toISOString(),
      severity: riskBreakdown.risk_level,
      status: policyDecision === 'BLOCKED' ? 'BLOCKED' : (policyDecision === 'HELD_FOR_REVIEW' ? 'OPEN' : 'UNDER_INVESTIGATION'),
      risk_score: score,
      triggered_rules_count: riskBreakdown.reasons.length,
      summary: riskBreakdown.reasons.slice(0, 2).join('. '),
      assigned_to: 'Sentinel AI Auto-Triage',
    });
  }

  // Create Audit Log
  const auditLog: AuditLog = {
    log_id: `LOG_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    action: 'POLICY_ENFORCEMENT',
    actor: 'POLICY_ENGINE',
    transaction_id: tx.transaction_id,
    user_id: tx.user_id,
    details: {
      risk_score: score,
      risk_level: riskBreakdown.risk_level,
      agent_recommended: agentRecommendation,
      policy_decision: policyDecision,
      policy_rule: policyRule,
      reason,
      allowed,
    },
  };

  db.audit_logs.unshift(auditLog);

  return {
    allowed,
    policy_decision: policyDecision,
    policy_rule_applied: policyRule,
    reason,
    audit_entry: auditLog,
  };
}

import {
  ExtractedFeatures,
  MLPrediction,
  RuleResult,
  RiskScoreBreakdown
} from './types.ts';

export interface RiskThresholds {
  low: number; // default 30
  medium: number; // default 70
  high: number; // default 100
}

export const DEFAULT_THRESHOLDS: RiskThresholds = {
  low: 30,
  medium: 70,
  high: 100,
};

export function calculateRiskScore(
  features: ExtractedFeatures,
  mlPrediction: MLPrediction,
  rules: RuleResult[],
  customThresholds: RiskThresholds = DEFAULT_THRESHOLDS
): RiskScoreBreakdown {
  // 1. ML Contribution (Weight ~ 45%)
  const mlScore = Math.round(mlPrediction.fraud_probability * 100);
  const mlWeighted = mlScore * 0.45;

  // 2. Rule Risk Contribution (Weight ~ 30%)
  const triggeredRules = rules.filter(r => r.triggered);
  const rawRuleSum = triggeredRules.reduce((acc, r) => acc + r.risk_contribution, 0);
  const ruleContribution = Math.min(35, Math.round(rawRuleSum * 0.35));

  // 3. Behavioral Anomaly Score (Z-Score + Time + Location Anomaly) (Weight ~ 15%)
  let behaviorAnomaly = 0;
  if (features.amount_z_score > 4) behaviorAnomaly += 10;
  else if (features.amount_z_score > 2) behaviorAnomaly += 6;
  if (features.unusual_time) behaviorAnomaly += 3;
  if (features.new_location) behaviorAnomaly += 2;
  if (features.recent_password_change) behaviorAnomaly += 5;
  const behavioralScore = Math.min(18, behaviorAnomaly);

  // 4. Device Risk (Weight ~ 10%)
  let devScore = 0;
  if (features.new_device) devScore += 4;
  if (features.device_risk >= 70) devScore += 6;
  const deviceRiskContribution = Math.min(10, devScore);

  // 5. Velocity Risk
  let velScore = 0;
  if (features.transaction_velocity_1h >= 2) velScore += 4;
  if (features.transaction_velocity_24h >= 5) velScore += 3;
  const velocityRiskContribution = Math.min(7, velScore);

  // 6. Network Risk Multiplier (Shared Infrastructure)
  let networkMultiplier = 1.0;
  if (features.network_shared_device_count >= 2 || features.network_shared_beneficiary_count >= 2) {
    networkMultiplier = 1.15;
  }
  if (features.network_shared_beneficiary_count >= 4) {
    networkMultiplier = 1.25;
  }

  // Combined score computation
  const rawTotal = (mlWeighted + ruleContribution + behavioralScore + deviceRiskContribution + velocityRiskContribution) * networkMultiplier;
  
  // Bound to 0 - 100
  let finalScore = Math.min(100, Math.max(1, Math.round(rawTotal)));

  // If critical rules triggered, ensure high score floor
  const hasCriticalRule = triggeredRules.some(r => r.severity === 'CRITICAL');
  if (hasCriticalRule && finalScore < 85) {
    finalScore = Math.min(99, Math.max(85, finalScore + 12));
  }

  // Categorize
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (finalScore > 90) riskLevel = 'CRITICAL';
  else if (finalScore > customThresholds.medium) riskLevel = 'HIGH';
  else if (finalScore > customThresholds.low) riskLevel = 'MEDIUM';
  else riskLevel = 'LOW';

  // Build summary reasons
  const reasons: string[] = [];
  if (features.amount_z_score > 3.0) {
    reasons.push(`Amount ₹${features.amount.toLocaleString('en-IN')} is ${features.amount_to_avg_ratio.toFixed(1)}x normal baseline (Z-Score: ${features.amount_z_score})`);
  }
  if (features.new_device) {
    reasons.push(`New unverified device (Risk Score: ${features.device_risk}/100)`);
  }
  if (features.new_beneficiary) {
    reasons.push(`New destination beneficiary (Risk Score: ${features.beneficiary_risk}/100)`);
  }
  if (features.unusual_time) {
    reasons.push('Transaction initiated outside normal active hours (Night window)');
  }
  if (features.recent_password_change) {
    reasons.push('Security Alert: Recent password modification within last 24 hours');
  }
  if (features.new_location) {
    reasons.push('Unusual geographic origin differing from home locations');
  }
  if (features.network_shared_beneficiary_count >= 2) {
    reasons.push(`Beneficiary linked across ${features.network_shared_beneficiary_count} unrelated user accounts`);
  }
  if (reasons.length === 0) {
    reasons.push('Transaction matches normal baseline behavior and trusted credentials.');
  }

  return {
    final_risk_score: finalScore,
    risk_level: riskLevel,
    ml_score_contribution: Math.round(mlWeighted),
    rule_risk_contribution: ruleContribution,
    behavioral_anomaly_score: behavioralScore,
    device_risk_contribution: deviceRiskContribution,
    velocity_risk_contribution: velocityRiskContribution,
    network_risk_multiplier: networkMultiplier,
    thresholds: customThresholds,
    reasons,
  };
}

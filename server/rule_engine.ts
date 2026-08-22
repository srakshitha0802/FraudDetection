import { ExtractedFeatures, RuleResult, Transaction, CustomRule, WatchlistItem } from './types.ts';
import { db } from './db.ts';

export interface FraudRule {
  id: string;
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  basePoints: number;
  evaluate: (features: ExtractedFeatures, tx: Transaction) => { triggered: boolean; reason: string; points?: number };
}

export const RULE_DEFINITIONS: FraudRule[] = [
  {
    id: 'R01_ATO_FULL_COMBO',
    name: 'Account Takeover (ATO) Multi-Signal Signature',
    severity: 'CRITICAL',
    basePoints: 35,
    evaluate: (f) => {
      const triggered = f.recent_password_change && f.new_device && f.amount_z_score > 3.0;
      return {
        triggered,
        reason: 'Critical combo: Password reset within 24h combined with a new device and massive amount deviation (>3σ).',
        points: 35,
      };
    },
  },
  {
    id: 'R02_HIGH_AMOUNT_DEVIATION',
    name: 'Extreme Amount Deviation From User Baseline',
    severity: 'HIGH',
    basePoints: 25,
    evaluate: (f) => {
      const triggered = f.amount_z_score > 4.0 || f.amount_to_avg_ratio > 10.0;
      return {
        triggered,
        reason: `Transaction amount (₹${f.amount.toLocaleString('en-IN')}) is ${f.amount_to_avg_ratio.toFixed(1)}x user normal baseline (Z-Score: ${f.amount_z_score}).`,
        points: f.amount_to_avg_ratio > 20 ? 30 : 22,
      };
    },
  },
  {
    id: 'R03_NEW_DEVICE_AND_BENEFICIARY',
    name: 'New Device + New Beneficiary Pair',
    severity: 'HIGH',
    basePoints: 20,
    evaluate: (f) => {
      const triggered = f.new_device && f.new_beneficiary;
      return {
        triggered,
        reason: 'Payment destination is a newly introduced beneficiary authorized from a brand-new untrusted device.',
        points: 20,
      };
    },
  },
  {
    id: 'R04_ROOTED_EMULATOR_DEVICE',
    name: 'High Risk / Rooted Emulator Hardware',
    severity: 'HIGH',
    basePoints: 25,
    evaluate: (f) => {
      const triggered = f.device_risk >= 70;
      return {
        triggered,
        reason: `Client telemetry indicates high hardware risk score (${f.device_risk}/100), possible rooted OS, emulator or automated bot client.`,
        points: 25,
      };
    },
  },
  {
    id: 'R05_NIGHT_HOURS_ANOMALY',
    name: 'Nighttime Operational Window Anomaly',
    severity: 'MEDIUM',
    basePoints: 15,
    evaluate: (f) => {
      const triggered = f.is_night_transaction && (f.new_device || f.amount_z_score > 2.0);
      return {
        triggered,
        reason: 'High-value or new-device transaction executed during low-activity night hours (01:00 AM - 05:00 AM).',
        points: 15,
      };
    },
  },
  {
    id: 'R06_FLAGGED_MULE_BENEFICIARY',
    name: 'Coordinated Mule Syndicate Destination',
    severity: 'CRITICAL',
    basePoints: 30,
    evaluate: (f) => {
      const triggered = f.beneficiary_risk >= 70 || f.network_shared_beneficiary_count >= 3;
      return {
        triggered,
        reason: `Beneficiary account is linked across ${f.network_shared_beneficiary_count} unrelated victim accounts or flagged for mule laundering.`,
        points: 30,
      };
    },
  },
  {
    id: 'R07_FAILED_LOGIN_SPIKE',
    name: 'Brute-force / Credential Stuffing Precursor',
    severity: 'HIGH',
    basePoints: 18,
    evaluate: (f) => {
      const triggered = f.failed_login_count >= 3 && f.new_device;
      return {
        triggered,
        reason: `Account recorded ${f.failed_login_count} consecutive failed login attempts before this new device session.`,
        points: 18,
      };
    },
  },
  {
    id: 'R08_RAPID_VELOCITY_SPIKE',
    name: 'Rapid Transaction Burst / Velocity Anomaly',
    severity: 'MEDIUM',
    basePoints: 16,
    evaluate: (f) => {
      const triggered = f.transaction_velocity_1h >= 2 && f.amount_z_score > 1.5;
      return {
        triggered,
        reason: `Multiple transactions detected within 60 minutes (${f.transaction_velocity_1h + 1} attempts) exceeding typical velocity.`,
        points: 16,
      };
    },
  },
  {
    id: 'R09_GEOLOCATION_DISCREPANCY',
    name: 'Impossible Geolocation Jump',
    severity: 'MEDIUM',
    basePoints: 12,
    evaluate: (f) => {
      const triggered = f.new_location && f.new_device;
      return {
        triggered,
        reason: 'Payment requested from an unfamiliar geolocation on a new client device without prior history.',
        points: 12,
      };
    },
  },
  {
    id: 'R10_HIGH_RISK_MERCHANT_CATEGORY',
    name: 'High-Risk Merchant / Crypto P2P Category',
    severity: 'LOW',
    basePoints: 10,
    evaluate: (f) => {
      const triggered = f.is_high_risk_category && f.amount_z_score > 2.0;
      return {
        triggered,
        reason: 'Funds routed toward high-risk merchant categories (Crypto / Gambling / High-velocity P2P).',
        points: 10,
      };
    },
  }
];

// Evaluate dynamic condition on transaction and features
export function evaluateDynamicCondition(cond: { field: string; operator: string; value: any }, features: any, tx: any): boolean {
  const fieldValue = features[cond.field] !== undefined ? features[cond.field] : tx[cond.field];
  if (fieldValue === undefined) return false;

  const targetValue = cond.value;

  switch (cond.operator) {
    case '>': return Number(fieldValue) > Number(targetValue);
    case '>=': return Number(fieldValue) >= Number(targetValue);
    case '<': return Number(fieldValue) < Number(targetValue);
    case '<=': return Number(fieldValue) <= Number(targetValue);
    case '==': return String(fieldValue).toLowerCase() === String(targetValue).toLowerCase();
    case '!=': return String(fieldValue).toLowerCase() !== String(targetValue).toLowerCase();
    case 'contains': return String(fieldValue).toLowerCase().includes(String(targetValue).toLowerCase());
    case 'in': {
      const arr = Array.isArray(targetValue) ? targetValue : String(targetValue).split(',').map(s => s.trim().toLowerCase());
      return arr.includes(String(fieldValue).toLowerCase());
    }
    default: return false;
  }
}

export function evaluateRules(features: ExtractedFeatures, tx: Transaction): RuleResult[] {
  const results: RuleResult[] = [];

  // 1. Evaluate Built-in Core Rules
  for (const rule of RULE_DEFINITIONS) {
    const res = rule.evaluate(features, tx);
    results.push({
      rule_id: rule.id,
      rule_name: rule.name,
      severity: rule.severity,
      reason: res.reason,
      risk_contribution: res.triggered ? (res.points || rule.basePoints) : 0,
      triggered: res.triggered,
    });
  }

  // 2. Evaluate Dynamic Custom Rules from DB
  if (db?.custom_rules) {
    for (const customRule of db.custom_rules.values()) {
      if (!customRule.enabled) continue;

      let triggered = false;
      if (customRule.conditions && customRule.conditions.length > 0) {
        if (customRule.logic === 'OR') {
          triggered = customRule.conditions.some(cond => evaluateDynamicCondition(cond, features, tx));
        } else {
          triggered = customRule.conditions.every(cond => evaluateDynamicCondition(cond, features, tx));
        }
      }

      if (triggered) {
        customRule.last_triggered_count = (customRule.last_triggered_count || 0) + 1;
      }

      results.push({
        rule_id: customRule.rule_id,
        rule_name: `[Custom] ${customRule.name}`,
        severity: customRule.severity,
        reason: triggered ? `${customRule.description} (Policy Action: ${customRule.action})` : customRule.description,
        risk_contribution: triggered ? customRule.risk_contribution : 0,
        triggered,
      });
    }
  }

  // 3. Evaluate Watchlists (Blacklist / Whitelist)
  if (db?.watchlists) {
    for (const wl of db.watchlists.values()) {
      let isMatch = false;
      if (wl.type === 'VPA' && tx.beneficiary_account && tx.beneficiary_account.toLowerCase() === wl.value.toLowerCase()) isMatch = true;
      if (wl.type === 'DEVICE_ID' && tx.device_id === wl.value) isMatch = true;
      if (wl.type === 'IP' && tx.ip_address === wl.value) isMatch = true;
      if (wl.type === 'USER_ID' && tx.user_id === wl.value) isMatch = true;

      if (isMatch) {
        wl.hits_count = (wl.hits_count || 0) + 1;
        if (wl.list_type === 'BLACKLIST') {
          results.push({
            rule_id: `WL_BLACK_${wl.id}`,
            rule_name: `Sanctions Blacklist Match (${wl.category})`,
            severity: 'CRITICAL',
            reason: `Target ${wl.type} (${wl.value}) matches active blacklist: ${wl.reason}`,
            risk_contribution: 60,
            triggered: true,
          });
        } else if (wl.list_type === 'WHITELIST') {
          results.push({
            rule_id: `WL_WHITE_${wl.id}`,
            rule_name: `Trusted Whitelist Pass (${wl.category})`,
            severity: 'LOW',
            reason: `Target ${wl.type} (${wl.value}) is on trusted whitelist: ${wl.reason}`,
            risk_contribution: -40,
            triggered: true,
          });
        }
      }
    }
  }

  return results;
}

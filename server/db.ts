import {
  Transaction,
  UserProfile,
  DeviceInfo,
  BeneficiaryInfo,
  FraudAlert,
  AuditLog,
  AgentInvestigationRecord,
  CustomRule,
  WatchlistItem,
  ApiKey,
  WebhookSubscription,
  CaseNote
} from './types.ts';
import { dbQuery, initDatabase } from './db_sqlite.ts';

// Auto-syncing Map that pushes mutations to SQLite
class SqliteMap<K, V> extends Map<K, V> {
  constructor(
    private tableName: string,
    private keyField: string,
    private syncFn: (key: K, val: V) => Promise<void>,
    private deleteFn?: (key: K) => Promise<void>
  ) {
    super();
  }

  set(key: K, value: V): this {
    super.set(key, value);
    this.syncFn(key, value).catch(err => {
      console.error(`SqliteMap Error: failed to sync set for ${this.tableName}`, err);
    });
    return this;
  }

  delete(key: K): boolean {
    const deleted = super.delete(key);
    if (deleted && this.deleteFn) {
      this.deleteFn(key).catch(err => {
        console.error(`SqliteMap Error: failed to sync delete for ${this.tableName}`, err);
      });
    }
    return deleted;
  }

  // Load from database directly without triggers
  loadRaw(key: K, value: V) {
    super.set(key, value);
  }
}

// Instantiate database collections
export const db = {
  users: new SqliteMap<string, UserProfile>(
    'users',
    'user_id',
    async (key, val) => {
      await dbQuery.run(`
        INSERT OR REPLACE INTO users (user_id, name, email, phone, account_created_at, kyc_status, average_transaction_amount, median_transaction_amount, std_dev_amount, maximum_normal_amount, account_status, failed_login_count_24h, recent_password_reset, recent_phone_change)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        val.user_id, val.name, val.email, val.phone, val.account_created_at, val.kyc_status,
        val.average_transaction_amount, val.median_transaction_amount, val.std_dev_amount,
        val.maximum_normal_amount, val.account_status, val.failed_login_count_24h,
        val.recent_password_reset ? 1 : 0, val.recent_phone_change ? 1 : 0
      ]);
    },
    async (key) => {
      await dbQuery.run('DELETE FROM users WHERE user_id = ?', [key]);
    }
  ),
  transactions: new SqliteMap<string, Transaction>(
    'transactions',
    'transaction_id',
    async (key, val) => {
      await dbQuery.run(`
        INSERT OR REPLACE INTO transactions (transaction_id, user_id, device_id, ip_address, location, amount, currency, payment_type, employment_status, housing_status, merchant_id, merchant_category, timestamp, request_hash, is_fraud_label)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        val.transaction_id, val.user_id, val.device_id, val.ip_address, val.location, val.amount, val.currency || 'INR',
        val.transaction_type, val.employment_status || 'Unknown', val.housing_status || 'Unknown',
        val.merchant_id || 'M_UNKNOWN', val.merchant_category || 'SHOPPING', val.timestamp,
        val.request_hash || '',
        val.is_fraud_label !== undefined ? val.is_fraud_label : -1
      ]);
      // Also sync risk scores if present
      if (val.risk_score !== undefined) {
        await dbQuery.run(`
          INSERT OR REPLACE INTO risk_scores (transaction_id, final_risk_score, risk_level, decision, ml_probability, rule_score, anomaly_score, device_score, velocity_score)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          val.transaction_id,
          val.risk_score,
          val.risk_level || 'LOW',
          val.policy_decision || 'APPROVE',
          val.calibrated_probability !== undefined ? val.calibrated_probability : (val.risk_score / 100.0),
          val.risk_score * 0.35,
          0.0, 0.0, 0.0
        ]);
      }
    },
    async (key) => {
      await dbQuery.run('DELETE FROM transactions WHERE transaction_id = ?', [key]);
      await dbQuery.run('DELETE FROM risk_scores WHERE transaction_id = ?', [key]);
    }
  ),
  devices: new SqliteMap<string, DeviceInfo>(
    'devices',
    'device_id',
    async (key, val) => {
      await dbQuery.run(`
        INSERT OR REPLACE INTO devices (device_id, device_model, os, browser, ip_address, is_vpn, is_rooted_or_jailbroken, is_emulator, reputation_score, first_seen, last_seen, associated_users_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        val.device_id, val.device_model, val.os, val.browser, val.ip_address,
        val.is_vpn ? 1 : 0, val.is_rooted_or_jailbroken ? 1 : 0, val.is_emulator ? 1 : 0,
        val.reputation_score, val.first_seen, val.last_seen, val.associated_users_count
      ]);
    },
    async (key) => {
      await dbQuery.run('DELETE FROM devices WHERE device_id = ?', [key]);
    }
  ),
  beneficiaries: new SqliteMap<string, BeneficiaryInfo>(
    'beneficiaries',
    'beneficiary_id',
    async (key, val) => {
      await dbQuery.run(`
        INSERT OR REPLACE INTO beneficiaries (beneficiary_id, name, account_or_vpa, bank_name, created_at, is_verified, risk_score, associated_accounts_count, is_flagged_mule)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        val.beneficiary_id, val.name, val.account_or_vpa, val.bank_name, val.created_at,
        val.is_verified ? 1 : 0, val.risk_score, val.associated_accounts_count, val.is_flagged_mule ? 1 : 0
      ]);
    },
    async (key) => {
      await dbQuery.run('DELETE FROM beneficiaries WHERE beneficiary_id = ?', [key]);
    }
  ),
  fraud_alerts: new Map<string, FraudAlert>(), // kept simple, populated via server.ts
  investigations: new Map<string, AgentInvestigationRecord>(),
  audit_logs: [] as AuditLog[],
  custom_rules: new SqliteMap<string, CustomRule>(
    'custom_rules',
    'rule_id',
    async (key, val) => {
      await dbQuery.run(`
        INSERT OR REPLACE INTO custom_rules (id, name, description, rule_condition, risk_contribution, severity, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        val.rule_id, val.name, val.description, JSON.stringify(val.conditions),
        val.risk_contribution, val.severity, val.enabled ? 1 : 0, val.created_at
      ]);
    },
    async (key) => {
      await dbQuery.run('DELETE FROM custom_rules WHERE id = ?', [key]);
    }
  ),
  watchlists: new SqliteMap<string, WatchlistItem>(
    'watchlists',
    'id',
    async (key, val) => {
      await dbQuery.run(`
        INSERT OR REPLACE INTO watchlists (id, type, value, reason, risk_weight, added_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        val.id, val.type, val.value, val.reason, val.risk_weight || 50, val.created_at
      ]);
    },
    async (key) => {
      await dbQuery.run('DELETE FROM watchlists WHERE id = ?', [key]);
    }
  ),
  api_keys: new SqliteMap<string, ApiKey>(
    'api_keys',
    'key_id',
    async (key, val) => {
      await dbQuery.run(`
        INSERT OR REPLACE INTO api_keys (id, name, prefix, secret_hash, created_at, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        val.key_id, val.name, val.prefix, val.key_secret, val.created_at, val.is_active ? 'ACTIVE' : 'INACTIVE'
      ]);
    },
    async (key) => {
      await dbQuery.run('DELETE FROM api_keys WHERE id = ?', [key]);
    }
  ),
  webhooks: new SqliteMap<string, WebhookSubscription>(
    'webhooks',
    'webhook_id',
    async (key, val) => {
      await dbQuery.run(`
        INSERT OR REPLACE INTO webhooks (id, url, secret, events, created_at, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        val.webhook_id, val.target_url, val.secret_token, JSON.stringify(val.events), val.created_at, val.status
      ]);
    },
    async (key) => {
      await dbQuery.run('DELETE FROM webhooks WHERE id = ?', [key]);
    }
  ),
  case_notes: new Map<string, CaseNote[]>(),
};

// Seed database wrapper
export async function seedDatabase() {
  await initDatabase();
  
  // Load tables from SQLite into our memory Map collections
  const usersList = await dbQuery.all('SELECT * FROM users');
  for (const u of usersList) {
    db.users.loadRaw(u.user_id, {
      user_id: u.user_id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      account_created_at: u.account_created_at,
      kyc_status: u.kyc_status as any,
      average_transaction_amount: u.average_transaction_amount,
      median_transaction_amount: u.median_transaction_amount,
      std_dev_amount: u.std_dev_amount,
      maximum_normal_amount: u.maximum_normal_amount,
      usual_transaction_times: ['08:00-22:00'],
      usual_locations: ['Bengaluru'],
      usual_devices: [],
      usual_merchants: [],
      usual_beneficiaries: [],
      average_daily_transaction_count: 2,
      average_daily_transaction_volume: 4000,
      recent_password_reset: u.recent_password_reset === 1,
      recent_phone_change: u.recent_phone_change === 1,
      failed_login_count_24h: u.failed_login_count_24h,
      account_status: u.account_status as any
    });
  }

  const devicesList = await dbQuery.all('SELECT * FROM devices');
  for (const d of devicesList) {
    db.devices.loadRaw(d.device_id, {
      device_id: d.device_id,
      device_model: d.device_model,
      os: d.os,
      browser: d.browser,
      ip_address: d.ip_address,
      is_vpn: d.is_vpn === 1,
      is_rooted_or_jailbroken: d.is_rooted_or_jailbroken === 1,
      is_emulator: d.is_emulator === 1,
      reputation_score: d.reputation_score,
      first_seen: d.first_seen,
      last_seen: d.last_seen,
      associated_users_count: d.associated_users_count,
      associated_users: []
    });
  }

  const beneficiariesList = await dbQuery.all('SELECT * FROM beneficiaries');
  for (const b of beneficiariesList) {
    db.beneficiaries.loadRaw(b.beneficiary_id, {
      beneficiary_id: b.beneficiary_id,
      name: b.name,
      account_or_vpa: b.account_or_vpa,
      bank_name: b.bank_name,
      created_at: b.created_at,
      is_verified: b.is_verified === 1,
      risk_score: b.risk_score,
      associated_accounts_count: b.associated_accounts_count,
      associated_users: [],
      is_flagged_mule: b.is_flagged_mule === 1
    });
  }

  const rulesList = await dbQuery.all('SELECT * FROM custom_rules');
  for (const r of rulesList) {
    let conditions = [];
    try { conditions = JSON.parse(r.rule_condition); } catch {}
    db.custom_rules.loadRaw(r.id, {
      rule_id: r.id,
      name: r.name,
      description: r.description,
      enabled: r.is_active === 1,
      severity: r.severity as any,
      action: 'BLOCK',
      conditions: conditions,
      logic: 'AND',
      risk_contribution: r.risk_contribution,
      created_at: r.created_at,
      last_triggered_count: 0
    });
  }

  const watchlistsList = await dbQuery.all('SELECT * FROM watchlists');
  for (const w of watchlistsList) {
    db.watchlists.loadRaw(w.id, {
      id: w.id,
      type: w.type as any,
      value: w.value,
      list_type: 'BLACKLIST',
      category: 'MULE',
      reason: w.reason,
      created_at: w.added_at,
      created_by: 'SYSTEM',
      hits_count: 0
    });
  }

  const keysList = await dbQuery.all('SELECT * FROM api_keys');
  for (const k of keysList) {
    db.api_keys.loadRaw(k.id, {
      key_id: k.id,
      name: k.name,
      prefix: k.prefix,
      key_secret: k.secret_hash,
      environment: 'live',
      permissions: ['read', 'write'],
      created_at: k.created_at,
      last_used_at: null,
      is_active: k.status === 'ACTIVE'
    });
  }

  const webhooksList = await dbQuery.all('SELECT * FROM webhooks');
  for (const wh of webhooksList) {
    let events = [];
    try { events = JSON.parse(wh.events); } catch {}
    db.webhooks.loadRaw(wh.id, {
      webhook_id: wh.id,
      target_url: wh.url,
      secret_token: wh.secret,
      events: events,
      status: wh.status as any,
      last_delivery_at: null,
      last_status_code: null,
      created_at: wh.created_at
    });
  }

  // Load Transactions
  const txsList = await dbQuery.all('SELECT * FROM transactions');
  for (const tx of txsList) {
    const risk = await dbQuery.get('SELECT * FROM risk_scores WHERE transaction_id = ?', [tx.transaction_id]);
    db.transactions.loadRaw(tx.transaction_id, {
      transaction_id: tx.transaction_id,
      user_id: tx.user_id,
      amount: tx.amount,
      currency: tx.currency,
      merchant_id: tx.merchant_id,
      merchant_category: tx.merchant_category as any,
      timestamp: tx.timestamp,
      transaction_type: tx.payment_type as any,
      device_id: tx.device_id,
      ip_address: tx.ip_address,
      location: tx.location,
      is_fraud_label: tx.is_fraud_label,
      request_hash: tx.request_hash,
      status: risk ? (risk.decision === 'BLOCK' ? 'BLOCKED' : 'APPROVED') : 'APPROVED',
      risk_score: risk ? risk.final_risk_score : undefined,
      risk_level: risk ? risk.risk_level : undefined
    });
  }

  console.log(`Successfully synced SQLite data to memory cache maps. Loaded ${db.transactions.size} transactions.`);
}



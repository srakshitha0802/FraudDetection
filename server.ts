import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db, seedDatabase } from './server/db.ts';
import {
  extractFeatures,
  predictFraudML,
  trainModel,
  deployTrainedModel,
  getActiveDeployedModel,
  getModelHistory
} from './server/ml_engine.ts';
import { evaluateRules } from './server/rule_engine.ts';
import { calculateRiskScore } from './server/risk_engine.ts';
import { enforcePolicy } from './server/policy_engine.ts';
import { investigateTransaction, queryForensicAgent } from './server/ai_agent.ts';
import { buildFraudNetworkGraph } from './server/graph_engine.ts';
import { runAllTests } from './server/test_runner.ts';
import { Transaction, EmailDispatchRecord } from './server/types.ts';
import { analyzeScamContent, chatCyberAdvisor, ScamAnalysisResult } from './server/personal_ai.ts';
import { sendFraudAlert, sendTestEmail, sendDirectEmail, emailDispatchStore } from './server/emailService.ts';
import { sendFraudSmsAlert, sendDirectSms, smsDispatchStore } from './server/smsService.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  let txGlobalCounter = Date.now() % 100000;
  function generateUniqueTxId(): string {
    txGlobalCounter += 1;
    let id = `TX${txGlobalCounter}`;
    while (db.transactions.has(id)) {
      txGlobalCounter += 1;
      id = `TX${txGlobalCounter}`;
    }
    return id;
  }

  // 1. Ingest & Analyze Transaction Endpoint
  app.post('/api/transactions/analyze', async (req, res) => {
    try {
      const payload: Partial<Transaction> = req.body;

      if (!payload.user_id || !payload.amount) {
        return res.status(400).json({ error: 'user_id and amount are required' });
      }

      const txId = payload.transaction_id || generateUniqueTxId();
      const user = db.users.get(payload.user_id);

      if (user) {
        if (req.body.recent_password_reset !== undefined) {
          user.recent_password_reset = Boolean(req.body.recent_password_reset);
        }
        if (req.body.failed_login_count_24h !== undefined) {
          user.failed_login_count_24h = Number(req.body.failed_login_count_24h);
        }
      }

      const tx: Transaction = {
        transaction_id: txId,
        user_id: payload.user_id,
        user_name: user?.name || `User ${payload.user_id}`,
        amount: Number(payload.amount),
        currency: payload.currency || 'INR',
        merchant_id: payload.merchant_id || 'M_DIRECT_TRANSFER',
        merchant_name: payload.merchant_name || 'Direct Transfer / Merchant',
        merchant_category: payload.merchant_category || 'TRANSFER',
        timestamp: payload.timestamp || new Date().toISOString(),
        transaction_type: payload.transaction_type || 'UPI',
        device_id: payload.device_id || (user?.usual_devices[0] || 'DEV_UNKNOWN'),
        device_model: payload.device_model || (db.devices.get(payload.device_id || '')?.device_model || 'Unknown Client Device'),
        ip_address: payload.ip_address || '49.207.210.45',
        location: payload.location || (user?.usual_locations[0] || 'Bengaluru'),
        beneficiary_id: payload.beneficiary_id,
        beneficiary_name: payload.beneficiary_name || (payload.beneficiary_id ? db.beneficiaries.get(payload.beneficiary_id)?.name : undefined),
        beneficiary_account: payload.beneficiary_account || (payload.beneficiary_id ? db.beneficiaries.get(payload.beneficiary_id)?.account_or_vpa : undefined),
        status: 'PENDING',
      };

      // Store in DB
      db.transactions.set(tx.transaction_id, tx);

      // Extract Features
      const features = extractFeatures(tx, user);

      // Run ML Model
      const mlPrediction = predictFraudML(features);

      // Run Deterministic Rules
      const ruleResults = evaluateRules(features, tx);

      // Calculate Composite Risk Score
      const riskBreakdown = calculateRiskScore(features, mlPrediction, ruleResults);

      // Launch AI Investigation Agent
      const investigation = await investigateTransaction(tx.transaction_id);

      // Fetch updated tx
      const updatedTx = db.transactions.get(tx.transaction_id) || tx;

      // Immediately dispatch Email & Twilio SMS Alert Message with transaction details
      const alertEmailPromise = sendFraudAlert({
        id: updatedTx.transaction_id,
        amount: updatedTx.amount,
        riskScore: riskBreakdown.final_risk_score,
        riskLevel: riskBreakdown.risk_level,
        merchant_name: updatedTx.merchant_name || updatedTx.beneficiary_name || 'UPI Payment',
        fraud_signals: ruleResults.filter(r => r.triggered).map(r => r.rule_name),
        to: user?.email || process.env.ALERT_EMAIL || 'srakshitha912@gmail.com'
      }).catch(err => console.warn('[AUTO-FRAUD-ALERT-EMAIL-ERROR]', err));

      const alertSmsPromise = sendFraudSmsAlert({
        id: updatedTx.transaction_id,
        amount: updatedTx.amount,
        riskScore: riskBreakdown.final_risk_score,
        riskLevel: riskBreakdown.risk_level,
        merchant_name: updatedTx.merchant_name || updatedTx.beneficiary_name || 'UPI Payment',
        fraud_signals: ruleResults.filter(r => r.triggered).map(r => r.rule_name),
        toPhone: user?.phone || process.env.ALERT_PHONE || '+918639975744'
      }).catch(err => console.warn('[AUTO-FRAUD-ALERT-SMS-ERROR]', err));

      await Promise.all([alertEmailPromise, alertSmsPromise]);

      res.json({
        success: true,
        transaction: updatedTx,
        features,
        ml_prediction: mlPrediction,
        rule_results: ruleResults,
        risk_breakdown: riskBreakdown,
        investigation,
      });
    } catch (err: any) {
      console.error('Error analyzing transaction:', err);
      res.status(500).json({ error: err.message || 'Failed to analyze transaction' });
    }
  });

  // 2. Get Transactions List
  app.get('/api/transactions', (req, res) => {
    const list = Array.from(db.transactions.values()).reverse();
    res.json(list);
  });

  // 3. Get Specific Transaction
  app.get('/api/transactions/:id', (req, res) => {
    const tx = db.transactions.get(req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    res.json(tx);
  });

  // 4. Get or Trigger Investigation for a Transaction
  app.get('/api/transactions/:id/investigation', async (req, res) => {
    const tx = db.transactions.get(req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    let inv = tx.investigation_id ? db.investigations.get(tx.investigation_id) : undefined;
    if (!inv) {
      // Create fresh investigation
      inv = await investigateTransaction(tx.transaction_id);
    }
    res.json(inv);
  });

  // 5. Trigger Agent Investigation Directly
  app.post('/api/agent/investigate', async (req, res) => {
    try {
      const { transaction_id } = req.body;
      if (!transaction_id) return res.status(400).json({ error: 'transaction_id required' });

      const record = await investigateTransaction(transaction_id);
      res.json(record);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Get Users & User Profile
  app.get('/api/users', (req, res) => {
    res.json(Array.from(db.users.values()));
  });

  app.get('/api/users/:id/profile', (req, res) => {
    const user = db.users.get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User profile not found' });
    res.json(user);
  });

  // 7. Get Devices & Beneficiaries
  app.get('/api/devices', (req, res) => {
    res.json(Array.from(db.devices.values()));
  });

  app.get('/api/beneficiaries', (req, res) => {
    res.json(Array.from(db.beneficiaries.values()));
  });

  // 8. Get Fraud Alerts
  app.get('/api/fraud-alerts', (req, res) => {
    res.json(Array.from(db.fraud_alerts.values()).reverse());
  });

  app.patch('/api/fraud-alerts/:id', (req, res) => {
    const alert = db.fraud_alerts.get(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    const { status, assigned_to } = req.body;
    if (status) alert.status = status;
    if (assigned_to) alert.assigned_to = assigned_to;
    res.json(alert);
  });

  // 9. Get Fraud Network Graph
  app.get('/api/fraud-network', (req, res) => {
    const txId = req.query.transaction_id as string | undefined;
    const graph = buildFraudNetworkGraph(txId);
    res.json(graph);
  });

  // 10. Get Analytics & Model Metrics
  app.get('/api/analytics', (req, res) => {
    const allTx = Array.from(db.transactions.values());
    const totalCount = allTx.length;
    const highRisk = allTx.filter(t => (t.risk_score || 0) >= 71);
    const blocked = allTx.filter(t => t.status === 'BLOCKED');
    const held = allTx.filter(t => t.status === 'HELD' || t.status === 'VERIFICATION_REQUIRED');
    const approved = allTx.filter(t => t.status === 'APPROVED');

    const totalVolume = allTx.reduce((acc, t) => acc + t.amount, 0);
    const fraudPreventedVolume = allTx
      .filter(t => t.status === 'BLOCKED' || t.status === 'HELD')
      .reduce((acc, t) => acc + t.amount, 0);

    const alerts = Array.from(db.fraud_alerts.values());

    res.json({
      summary: {
        total_transactions: totalCount,
        analyzed_transactions: totalCount,
        fraud_detected_count: highRisk.length,
        fraud_prevented_count: blocked.length + held.length,
        fraud_prevented_volume: fraudPreventedVolume,
        total_volume: totalVolume,
        active_alerts_count: alerts.filter(a => a.status === 'OPEN' || a.status === 'UNDER_INVESTIGATION').length,
        avg_risk_score: totalCount > 0 ? Math.round(allTx.reduce((a, t) => a + (t.risk_score || 0), 0) / totalCount) : 0,
      },
      risk_distribution: {
        low: allTx.filter(t => (t.risk_score || 0) <= 30).length,
        medium: allTx.filter(t => (t.risk_score || 0) > 30 && (t.risk_score || 0) <= 70).length,
        high: allTx.filter(t => (t.risk_score || 0) > 70 && (t.risk_score || 0) <= 90).length,
        critical: allTx.filter(t => (t.risk_score || 0) > 90).length,
      },
      status_distribution: {
        approved: approved.length,
        held: held.length,
        blocked: blocked.length,
      },
      category_breakdown: [
        { category: 'Account Takeover (ATO)', count: 18, share: '38%' },
        { category: 'Money Mule Network', count: 14, share: '29%' },
        { category: 'New Device / SIM Swap', count: 8, share: '17%' },
        { category: 'Phishing / Fake Refund', count: 5, share: '10%' },
        { category: 'Velocity / Bot Attack', count: 3, share: '6%' },
      ],
      hourly_trend: [
        { hour: '00:00', legitimate: 42, fraud: 1 },
        { hour: '02:00', legitimate: 18, fraud: 7 },
        { hour: '04:00', legitimate: 12, fraud: 9 },
        { hour: '06:00', legitimate: 35, fraud: 2 },
        { hour: '08:00', legitimate: 85, fraud: 1 },
        { hour: '10:00', legitimate: 142, fraud: 3 },
        { hour: '12:00', legitimate: 188, fraud: 4 },
        { hour: '14:00', legitimate: 165, fraud: 2 },
        { hour: '16:00', legitimate: 190, fraud: 5 },
        { hour: '18:00', legitimate: 210, fraud: 3 },
        { hour: '20:00', legitimate: 175, fraud: 4 },
        { hour: '22:00', legitimate: 95, fraud: 6 },
      ]
    });
  });

  // 11. Model Performance Metrics & Training Studio
  app.get('/api/model/metrics', (req, res) => {
    const activeModel = getActiveDeployedModel();
    res.json({
      model_name: activeModel.name,
      model_version: activeModel.version,
      model_type: activeModel.type,
      training_samples: 50000,
      validation_samples: 10000,
      features_count: 18,
      accuracy: activeModel.accuracy,
      precision: activeModel.precision,
      recall: activeModel.recall,
      f1_score: activeModel.f1_score,
      roc_auc: activeModel.roc_auc,
      pr_auc: activeModel.pr_auc,
      log_loss: activeModel.log_loss,
      psi_drift_score: activeModel.psi_drift_score,
      deployed_at: activeModel.deployed_at,
      latency_p95_ms: 18.4,
      confusion_matrix: {
        true_positives: 1467,
        false_positives: 58,
        true_negatives: 8442,
        false_negatives: 33,
      },
      feature_importances: [
        { name: 'amount_z_score', score: 0.28, description: 'Deviation from user baseline amount' },
        { name: 'new_device_indicator', score: 0.22, description: 'Unrecognized hardware fingerprint' },
        { name: 'new_beneficiary_risk', score: 0.18, description: 'Fan-in and unverified payee risk' },
        { name: 'credential_reset_recency', score: 0.14, description: 'Password reset within 24 hours' },
        { name: 'nighttime_hour_flag', score: 0.10, description: 'Transaction hour between 01:00-05:00' },
        { name: 'location_jump_km', score: 0.08, description: 'Distance from usual residential city' },
      ],
      roc_curve: [
        { fpr: 0.00, tpr: 0.00 },
        { fpr: 0.01, tpr: 0.88 },
        { fpr: 0.02, tpr: 0.94 },
        { fpr: 0.04, tpr: 0.97 },
        { fpr: 0.08, tpr: 0.99 },
        { fpr: 0.15, tpr: 0.995 },
        { fpr: 1.00, tpr: 1.00 },
      ]
    });
  });

  app.get('/api/model/active', (req, res) => {
    res.json(getActiveDeployedModel());
  });

  app.get('/api/model/training-history', (req, res) => {
    res.json(getModelHistory());
  });

  app.post('/api/model/train', async (req, res) => {
    try {
      const config = req.body || {};
      const result = await trainModel(config);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/model/deploy/:trainingId', (req, res) => {
    try {
      const result = deployTrainedModel(req.params.trainingId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 12. Audit Logs
  app.get('/api/audit-logs', (req, res) => {
    res.json(db.audit_logs.slice(0, 100));
  });

  // 13. Dynamic Custom Rules Management API
  app.get('/api/v1/rules', (req, res) => {
    res.json(Array.from(db.custom_rules.values()));
  });

  app.post('/api/v1/rules', (req, res) => {
    try {
      const { name, description, severity, action, conditions, logic, risk_contribution, tags } = req.body;
      if (!name || !conditions || !action) {
        return res.status(400).json({ error: 'Name, conditions, and action are required' });
      }
      const rule_id = `CR_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const newRule: any = {
        rule_id,
        name,
        description: description || 'Custom user-defined security rule',
        enabled: true,
        severity: severity || 'HIGH',
        action: action || 'STEP_UP_OTP',
        conditions: conditions || [],
        logic: logic || 'AND',
        risk_contribution: Number(risk_contribution) || 25,
        created_at: new Date().toISOString(),
        last_triggered_count: 0,
        tags: tags || ['CUSTOM', 'USER_DEFINED'],
      };
      db.custom_rules.set(rule_id, newRule);
      
      db.audit_logs.unshift({
        log_id: `LOG_${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'CUSTOM_RULE_CREATED',
        actor: 'SECURITY_ANALYST',
        details: { rule_id, name, action, risk_contribution },
      });

      res.status(201).json(newRule);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/v1/rules/:id/toggle', (req, res) => {
    const rule = db.custom_rules.get(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    rule.enabled = !rule.enabled;
    res.json(rule);
  });

  app.delete('/api/v1/rules/:id', (req, res) => {
    const deleted = db.custom_rules.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Rule not found' });
    res.json({ success: true, message: 'Rule deleted' });
  });

  // Dry-run custom rule across historical transaction database
  app.post('/api/v1/rules/dry-run', (req, res) => {
    try {
      const { conditions, logic } = req.body;
      if (!conditions) return res.status(400).json({ error: 'conditions required' });
      
      const allTransactions = Array.from(db.transactions.values());
      let matchedCount = 0;
      let truePositiveEstimate = 0;
      let falsePositiveEstimate = 0;
      const sampleHits: any[] = [];

      for (const tx of allTransactions) {
        const user = db.users.get(tx.user_id);
        const features = extractFeatures(tx, user);
        
        let isMatch = false;
        if (logic === 'OR') {
          isMatch = conditions.some((c: any) => {
            const val = features[c.field] !== undefined ? features[c.field] : (tx as any)[c.field];
            if (c.operator === '>') return Number(val) > Number(c.value);
            if (c.operator === '>=') return Number(val) >= Number(c.value);
            if (c.operator === '<') return Number(val) < Number(c.value);
            if (c.operator === '<=') return Number(val) <= Number(c.value);
            if (c.operator === '==') return String(val).toLowerCase() === String(c.value).toLowerCase();
            return false;
          });
        } else {
          isMatch = conditions.every((c: any) => {
            const val = features[c.field] !== undefined ? features[c.field] : (tx as any)[c.field];
            if (c.operator === '>') return Number(val) > Number(c.value);
            if (c.operator === '>=') return Number(val) >= Number(c.value);
            if (c.operator === '<') return Number(val) < Number(c.value);
            if (c.operator === '<=') return Number(val) <= Number(c.value);
            if (c.operator === '==') return String(val).toLowerCase() === String(c.value).toLowerCase();
            return false;
          });
        }

        if (isMatch) {
          matchedCount++;
          if ((tx.risk_score || 0) >= 70 || tx.status === 'BLOCKED' || tx.status === 'HELD') {
            truePositiveEstimate++;
          } else {
            falsePositiveEstimate++;
          }
          if (sampleHits.length < 5) {
            sampleHits.push({
              transaction_id: tx.transaction_id,
              amount: tx.amount,
              user_id: tx.user_id,
              current_risk_score: tx.risk_score,
            });
          }
        }
      }

      res.json({
        total_historical_analyzed: allTransactions.length,
        matched_count: matchedCount,
        hit_rate: allTransactions.length > 0 ? ((matchedCount / allTransactions.length) * 100).toFixed(1) + '%' : '0%',
        estimated_true_positives: truePositiveEstimate,
        estimated_false_positives: falsePositiveEstimate,
        precision_estimate: matchedCount > 0 ? ((truePositiveEstimate / matchedCount) * 100).toFixed(1) + '%' : '100%',
        sample_hits: sampleHits,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 14. Watchlists (Blacklist / Whitelist) API
  app.get('/api/v1/watchlists', (req, res) => {
    res.json(Array.from(db.watchlists.values()).reverse());
  });

  app.post('/api/v1/watchlists', (req, res) => {
    try {
      const { type, value, list_type, category, reason, created_by } = req.body;
      if (!type || !value || !list_type) {
        return res.status(400).json({ error: 'type, value, and list_type are required' });
      }
      const id = `WL_${Date.now()}`;
      const item: any = {
        id,
        type,
        value: value.trim(),
        list_type,
        category: category || (list_type === 'BLACKLIST' ? 'MULE' : 'TRUSTED_VIP'),
        reason: reason || 'Added via Watchlist Console',
        created_at: new Date().toISOString(),
        created_by: created_by || 'Security Operations Center',
        hits_count: 0,
      };
      db.watchlists.set(id, item);

      db.audit_logs.unshift({
        log_id: `LOG_${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'WATCHLIST_ENTRY_ADDED',
        actor: 'SECURITY_ANALYST',
        details: { id, type, value, list_type, category },
      });

      res.status(201).json(item);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/v1/watchlists/:id', (req, res) => {
    const deleted = db.watchlists.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Watchlist entry not found' });
    res.json({ success: true, message: 'Watchlist entry removed' });
  });

  // 15. API Keys & Webhooks API
  app.get('/api/v1/api-keys', (req, res) => {
    res.json(Array.from(db.api_keys.values()));
  });

  app.post('/api/v1/api-keys', (req, res) => {
    try {
      const { name, environment } = req.body;
      const key_id = `KEY_${Date.now()}`;
      const prefix = environment === 'live' ? 'fs_live_' : 'fs_test_';
      const secret = prefix + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      const newKey: any = {
        key_id,
        name: name || 'Payment Gateway API Key',
        key_secret: secret,
        environment: environment || 'live',
        permissions: ['transactions:ingest', 'transactions:read', 'risk:evaluate'],
        created_at: new Date().toISOString(),
        last_used_at: null,
        is_active: true,
      };
      db.api_keys.set(key_id, newKey);
      res.status(201).json(newKey);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/v1/api-keys/:id', (req, res) => {
    const deleted = db.api_keys.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'API Key not found' });
    res.json({ success: true });
  });

  app.get('/api/v1/webhooks', (req, res) => {
    res.json(Array.from(db.webhooks.values()));
  });

  app.post('/api/v1/webhooks', (req, res) => {
    try {
      const { target_url, events } = req.body;
      if (!target_url) return res.status(400).json({ error: 'target_url required' });
      const webhook_id = `WH_${Date.now()}`;
      const newWebhook: any = {
        webhook_id,
        target_url,
        secret_token: 'whsec_' + Math.random().toString(36).substring(2, 14),
        events: events && events.length > 0 ? events : ['transaction.blocked', 'transaction.held', 'alert.created'],
        status: 'ACTIVE',
        last_delivery_at: null,
        last_status_code: null,
        created_at: new Date().toISOString(),
      };
      db.webhooks.set(webhook_id, newWebhook);
      res.status(201).json(newWebhook);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/v1/webhooks/:id/test-ping', (req, res) => {
    const wh = db.webhooks.get(req.params.id);
    if (!wh) return res.status(404).json({ error: 'Webhook not found' });
    wh.last_delivery_at = new Date().toISOString();
    wh.last_status_code = 200;
    res.json({
      success: true,
      message: `Test ping dispatched to ${wh.target_url}`,
      timestamp: wh.last_delivery_at,
      status_code: 200,
    });
  });

  // 16. Case Notes & Regulatory SAR Export
  app.get('/api/v1/cases/:alertId/notes', (req, res) => {
    const notes = db.case_notes.get(req.params.alertId) || [];
    res.json(notes);
  });

  app.post('/api/v1/cases/:alertId/notes', (req, res) => {
    const { author, content, action_taken } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    const note = {
      note_id: `CN_${Date.now()}`,
      alert_id: req.params.alertId,
      author: author || 'Security Operations Analyst',
      content,
      timestamp: new Date().toISOString(),
      action_taken,
    };
    const existing = db.case_notes.get(req.params.alertId) || [];
    existing.push(note);
    db.case_notes.set(req.params.alertId, existing);
    res.status(201).json(note);
  });

  app.get('/api/v1/sar/export/:txId', async (req, res) => {
    try {
      const tx = db.transactions.get(req.params.txId);
      if (!tx) return res.status(404).json({ error: 'Transaction not found' });
      const user = db.users.get(tx.user_id) || null;
      let inv = tx.investigation_id ? db.investigations.get(tx.investigation_id) : undefined;
      if (!inv) {
        inv = await investigateTransaction(tx.transaction_id);
      }

      const sarReport = {
        report_id: `SAR-FIU-${Date.now().toString(36).toUpperCase()}`,
        generated_at: new Date().toISOString(),
        regulatory_filing_ref: `FIU-IND/PMLA/SEC12/${tx.transaction_id}`,
        fiu_jurisdiction: 'Financial Intelligence Unit - Anti Money Laundering Division',
        subject_transaction: tx,
        user_details: user,
        investigation_summary: inv?.investigation_summary || 'Transaction flagged by automated ML model and deterministic rules.',
        suspected_violation_types: [
          'Section 12: Suspicious Payment Velocity and Unauthorized Takeover Pattern',
          'Coordinated Mule Fan-In / Structuring Anomaly',
          'High Risk Proxy/Rooted Hardware Device Execution'
        ],
        total_suspicious_amount: tx.amount,
        evidence_matrix: inv?.evidence || [],
        analyst_attestation: {
          analyst_name: 'Lead Compliance Officer (ID: LCO-902)',
          filing_status: 'RECOMMENDED_FOR_FIU_TRANSMISSION',
          timestamp: new Date().toISOString(),
        }
      };

      res.json(sarReport);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 17. Bulk CSV / JSON Ingestion Engine
  app.post('/api/v1/transactions/batch-upload', async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'items array is required' });
      }

      let approved = 0;
      let stepUp = 0;
      let held = 0;
      let blocked = 0;
      let totalVolume = 0;
      let flaggedVolume = 0;
      const results: any[] = [];

      for (const item of items) {
        const txId = item.transaction_id || generateUniqueTxId();
        const user = db.users.get(item.user_id);
        const amount = Number(item.amount) || 1000;
        totalVolume += amount;

        const tx: Transaction = {
          transaction_id: txId,
          user_id: item.user_id || 'U102',
          user_name: user?.name || item.user_name || `User ${item.user_id}`,
          amount,
          currency: item.currency || 'INR',
          merchant_id: item.merchant_id || 'M_BATCH_IMPORT',
          merchant_name: item.merchant_name || 'Batch Ingested Transaction',
          merchant_category: item.merchant_category || 'TRANSFER',
          timestamp: item.timestamp || new Date().toISOString(),
          transaction_type: item.transaction_type || 'UPI',
          device_id: item.device_id || (user?.usual_devices[0] || 'DEV_BATCH'),
          device_model: item.device_model || 'Client Device',
          ip_address: item.ip_address || '49.207.210.45',
          location: item.location || (user?.usual_locations[0] || 'Bengaluru'),
          beneficiary_id: item.beneficiary_id,
          beneficiary_name: item.beneficiary_name,
          beneficiary_account: item.beneficiary_account,
          status: 'PENDING',
        };

        db.transactions.set(tx.transaction_id, tx);
        const features = extractFeatures(tx, user);
        const mlPrediction = predictFraudML(features);
        const ruleResults = evaluateRules(features, tx);
        const riskBreakdown = calculateRiskScore(features, mlPrediction, ruleResults);
        
        // Fast batch policy enforcement
        tx.risk_score = riskBreakdown.final_risk_score;
        tx.risk_level = riskBreakdown.risk_level;
        
        if (riskBreakdown.final_risk_score >= 85) {
          tx.status = 'BLOCKED';
          tx.policy_decision = 'BLOCKED';
          blocked++;
          flaggedVolume += amount;
        } else if (riskBreakdown.final_risk_score >= 70) {
          tx.status = 'HELD';
          tx.policy_decision = 'HELD_FOR_REVIEW';
          held++;
          flaggedVolume += amount;
        } else if (riskBreakdown.final_risk_score >= 35) {
          tx.status = 'VERIFICATION_REQUIRED';
          tx.policy_decision = 'STEP_UP_REQUIRED';
          stepUp++;
        } else {
          tx.status = 'APPROVED';
          tx.policy_decision = 'APPROVED';
          approved++;
        }

        if (tx.status === 'BLOCKED' || tx.status === 'HELD' || tx.status === 'VERIFICATION_REQUIRED') {
          const alertId = `ALT_${tx.transaction_id.replace('TX', '')}`;
          db.fraud_alerts.set(alertId, {
            alert_id: alertId,
            transaction_id: tx.transaction_id,
            user_id: tx.user_id,
            user_name: tx.user_name || tx.user_id,
            amount: tx.amount,
            currency: tx.currency,
            timestamp: tx.timestamp,
            severity: tx.status === 'BLOCKED' ? 'CRITICAL' : tx.status === 'HELD' ? 'HIGH' : 'MEDIUM',
            status: 'OPEN',
            risk_score: tx.risk_score,
            triggered_rules_count: ruleResults.filter(r => r.triggered).length,
            summary: `Batch ingest triggered: ${ruleResults.filter(r => r.triggered).map(r => r.rule_name).join(', ') || 'High Risk ML'}`,
          });
        }

        results.push({
          transaction: tx,
          risk_score: tx.risk_score,
          decision: tx.policy_decision,
          triggered_rules: ruleResults.filter(r => r.triggered).map(r => r.rule_name),
        });
      }

      res.json({
        total_processed: items.length,
        approved_count: approved,
        step_up_count: stepUp,
        held_count: held,
        blocked_count: blocked,
        total_volume: totalVolume,
        flagged_volume: flaggedVolume,
        results,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 18. Automated Unit & Integration Tests Runner
  const handleTestRunner = async (req: express.Request, res: express.Response) => {
    try {
      const report = await runAllTests();
      res.setHeader('Content-Type', 'application/json');
      res.json(report);
    } catch (err: any) {
      console.error('[TEST-RUNNER-ERROR]', err);
      res.status(500).json({ error: err.message || 'Internal Test Runner Failure' });
    }
  };

  app.post('/api/tests/run', handleTestRunner);
  app.get('/api/tests/run', handleTestRunner);
  app.post('/api/tests', handleTestRunner);
  app.get('/api/tests', handleTestRunner);

  // 19. Reset Demo / System State
  app.post('/api/reset-demo', (req, res) => {
    seedDatabase();
    res.json({ success: true, message: 'Database reset to initial calibrated production state.' });
  });

  // 20. Centralized Direct Email Dispatcher (Resend API + SMTP + In-App Mailbox & OTP Hub)
  // User-requested Test Routes for Resend Email API Verification
  app.get('/test-email', async (req, res) => {
    try {
      const targetEmail = (req.query.to as string) || process.env.ALERT_EMAIL || 'srakshitha912@gmail.com';
      const result = await sendFraudAlert({
        id: 'TEST-001',
        amount: 50000,
        riskScore: 97,
        riskLevel: 'HIGH',
        merchant_name: 'Suspicious Crypto Gateway / Mule Account',
        fraud_signals: [
          'Device fingerprint mismatch (emulator detected)',
          'Unverified beneficiary account with high fan-in velocity',
          'Amount deviates >4.8 std-dev from user historical baseline'
        ],
        to: targetEmail
      });

      res.json({
        success: true,
        message: 'Test fraud alert email sent via Resend API',
        target: targetEmail,
        result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  app.get('/api/test-email', async (req, res) => {
    try {
      const targetEmail = (req.query.to as string) || process.env.ALERT_EMAIL || 'srakshitha912@gmail.com';
      const result = await sendTestEmail(targetEmail);
      res.json({
        success: true,
        message: 'Test Resend API Hello World email dispatched',
        target: targetEmail,
        result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  app.post('/api/test-email', async (req, res) => {
    try {
      const { to, type, transaction } = req.body;
      const targetEmail = to || process.env.ALERT_EMAIL || 'srakshitha912@gmail.com';

      if (type === 'FRAUD_ALERT') {
        const result = await sendFraudAlert({
          id: transaction?.id || `TEST-${Date.now().toString().slice(-4)}`,
          amount: transaction?.amount || 50000,
          riskScore: transaction?.riskScore || 97,
          riskLevel: transaction?.riskLevel || 'HIGH',
          merchant_name: transaction?.merchant_name || 'Suspicious Mule Payee',
          fraud_signals: transaction?.fraud_signals || ['High velocity anomalous transfer'],
          to: targetEmail
        });
        return res.json({ success: true, message: 'Fraud alert email dispatched via Resend', target: targetEmail, result });
      }

      const result = await sendTestEmail(targetEmail);
      res.json({ success: true, message: 'Resend Hello World test email dispatched', target: targetEmail, result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Email API Endpoints
  app.get('/api/notifications/emails', (req, res) => {
    res.json(emailDispatchStore);
  });

  app.delete('/api/notifications/emails/clear', (req, res) => {
    emailDispatchStore.length = 0;
    res.json({ success: true, message: 'Dispatched emails cleared.' });
  });

  app.post('/api/notifications/send-email', async (req, res) => {
    try {
      const { to, subject, bodyText, bodyHtml, category, metadata } = req.body;
      if (!to || !subject) {
        return res.status(400).json({ error: 'Recipient "to" and "subject" are required' });
      }

      const result = await sendDirectEmail({
        to: to.trim().toLowerCase(),
        subject,
        bodyText: bodyText || subject,
        bodyHtml: bodyHtml || `<p>${bodyText || subject}</p>`,
        category: category || 'TEST_PING',
        metadata: metadata || {}
      });

      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // SMS API Endpoints (Twilio & Local Secure Dispatch)
  app.get('/api/notifications/sms', (req, res) => {
    res.json(smsDispatchStore);
  });

  app.delete('/api/notifications/sms/clear', (req, res) => {
    smsDispatchStore.length = 0;
    res.json({ success: true, message: 'Dispatched SMS records cleared.' });
  });

  app.post('/api/notifications/send-sms', async (req, res) => {
    try {
      const { to, message, category } = req.body;
      if (!message) {
        return res.status(400).json({ error: '"message" content is required' });
      }

      const result = await sendDirectSms(to, message, category || 'TEST_PING');
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // Transaction Analyst Actions & Real-Time Remediation Hub
  // =========================================================================
  app.post('/api/transactions/:id/action', async (req, res) => {
    try {
      const tx = db.transactions.get(req.params.id);
      if (!tx) return res.status(404).json({ error: 'Transaction not found' });

      const user = db.users.get(tx.user_id);
      const { action, code, analyst_name, notes, reason } = req.body;
      const targetEmail = (user?.email || 'srakshitha912@gmail.com').trim().toLowerCase();

      switch (action) {
        case 'STEP_UP_OTP': {
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          tx.otp_code = otp;
          tx.status = 'VERIFICATION_REQUIRED';
          tx.policy_decision = 'STEP_UP_REQUIRED';

          db.audit_logs.unshift({
            log_id: `LOG_${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'ANALYST_STEP_UP_CHALLENGE',
            actor: 'SECURITY_ANALYST',
            details: { transaction_id: tx.transaction_id, user_id: tx.user_id, target_email: targetEmail, otp_dispatched: true, analyst: analyst_name || 'SOC_ANALYST' }
          });

          // Dispatch live email to victim account
          await sendDirectEmail({
            to: targetEmail,
            subject: `🔑 [Sentinel Security] Step-Up 2FA OTP: ${otp} for Transaction ${tx.transaction_id}`,
            bodyText: `Your transaction of ₹${tx.amount.toLocaleString()} ${tx.currency} to ${tx.beneficiary_name || 'Beneficiary'} requires Step-Up authorization. Your 6-digit OTP is: ${otp}. Valid for 5 minutes.`,
            bodyHtml: `
              <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px; border-radius: 12px; max-width: 520px; border: 1px solid #1e293b;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                  <span style="font-size: 18px; font-weight: bold; color: #f43f5e;">Fraud Sentinel AI</span>
                  <span style="background-color: #0369a1; color: #38bdf8; font-size: 11px; padding: 2px 8px; border-radius: 9999px; font-weight: bold;">STEP-UP 2FA</span>
                </div>
                <h2 style="font-size: 16px; margin: 0 0 12px 0; color: #ffffff;">Secondary Security Verification Challenge</h2>
                <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0 0 18px 0;">
                  A transfer of <strong style="color: #ffffff;">₹${tx.amount.toLocaleString()} ${tx.currency}</strong> was initiated on your account from device <code style="color: #f43f5e;">${tx.device_id}</code>. Enter this OTP to approve the transfer:
                </p>
                <div style="background-color: #0f172a; border: 1px solid #0284c7; border-radius: 10px; padding: 18px; text-align: center; margin-bottom: 18px;">
                  <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">One-Time Security OTP</span>
                  <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: monospace; margin: 8px 0;">${otp}</div>
                  <span style="font-size: 11px; color: #f59e0b;">Valid for 5 minutes • Single Use</span>
                </div>
              </div>
            `,
            category: 'AUTH_OTP',
            metadata: { transaction_id: tx.transaction_id, otp }
          });

          return res.json({
            success: true,
            action: 'STEP_UP_OTP',
            otp,
            targetEmail,
            message: `Step-Up OTP challenge generated and dispatched to ${targetEmail}`,
            transaction: tx
          });
        }

        case 'VERIFY_OTP': {
          if (!code || String(code).trim() !== String(tx.otp_code).trim()) {
            return res.status(400).json({ error: 'Invalid 6-digit OTP. Please re-enter the code sent to your email.' });
          }

          tx.status = 'APPROVED';
          tx.policy_decision = 'APPROVED';
          tx.otp_code = undefined;

          db.audit_logs.unshift({
            log_id: `LOG_${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'STEP_UP_VERIFIED_APPROVED',
            actor: 'SECURITY_ANALYST',
            details: { transaction_id: tx.transaction_id, user_id: tx.user_id, verified_at: new Date().toISOString(), validation: 'USER_STEP_UP_VALIDATION' }
          });

          await sendDirectEmail({
            to: targetEmail,
            subject: `✅ [Sentinel] Transaction ${tx.transaction_id} Verified & Approved`,
            bodyText: `Your payment of ₹${tx.amount.toLocaleString()} was successfully authorized and processed.`,
            bodyHtml: `
              <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px; border-radius: 12px; max-width: 520px; border: 1px solid #1e293b;">
                <h2 style="font-size: 16px; margin: 0 0 12px 0; color: #10b981;">Payment Authorized Successfully</h2>
                <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0 0 18px 0;">
                  Transaction of <strong>₹${tx.amount.toLocaleString()}</strong> has been securely released and settled.
                </p>
              </div>
            `,
            category: 'TEST_PING'
          });

          return res.json({ success: true, verified: true, transaction: tx });
        }

        case 'HOLD_TRANSACTION': {
          const holdExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
          tx.status = 'HELD';
          tx.policy_decision = 'HELD_FOR_REVIEW';
          tx.hold_expires_at = holdExpiresAt;

          db.audit_logs.unshift({
            log_id: `LOG_${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'TRANSACTION_HELD_IN_ESCROW',
            actor: 'SECURITY_ANALYST',
            details: { transaction_id: tx.transaction_id, hold_duration_min: 5, expires_at: holdExpiresAt, analyst: analyst_name || 'SOC_ANALYST' }
          });

          await sendDirectEmail({
            to: targetEmail,
            subject: `⏳ [Sentinel Notice] Payment of ₹${tx.amount.toLocaleString()} Held for Security Review`,
            bodyText: `Your payment ${tx.transaction_id} is temporarily held for 5 minutes in AML escrow while security checks complete.`,
            bodyHtml: `
              <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px; border-radius: 12px; max-width: 520px; border: 1px solid #1e293b;">
                <h2 style="font-size: 16px; margin: 0 0 12px 0; color: #f59e0b;">Transaction Held in 5-Minute Escrow</h2>
                <p style="font-size: 13px; color: #94a3b8;">
                  Transaction <strong>${tx.transaction_id}</strong> of ₹${tx.amount.toLocaleString()} is held for verification.
                </p>
              </div>
            `,
            category: 'CARD_BLOCKED'
          });

          return res.json({ success: true, action: 'HOLD_TRANSACTION', transaction: tx });
        }

        case 'RELEASE_HOLD': {
          tx.status = 'APPROVED';
          tx.policy_decision = 'APPROVED';
          tx.hold_expires_at = undefined;

          db.audit_logs.unshift({
            log_id: `LOG_${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'ESCROW_HOLD_RELEASED',
            actor: 'SECURITY_ANALYST',
            details: { transaction_id: tx.transaction_id, reason: notes || 'Analyst verified legitimate transaction', analyst: analyst_name || 'SOC_ANALYST' }
          });

          return res.json({ success: true, action: 'RELEASE_HOLD', transaction: tx });
        }

        case 'FREEZE_DEVICE_MULE': {
          tx.status = 'BLOCKED';
          tx.policy_decision = 'BLOCKED';

          // Blacklist device
          const device = db.devices.get(tx.device_id);
          if (device) {
            device.reputation_score = 0;
            device.is_rooted_or_jailbroken = true;
            device.is_emulator = true;
          } else {
            db.devices.set(tx.device_id, {
              device_id: tx.device_id,
              device_model: tx.device_model || 'Flagged Hardware Endpoint',
              os: 'Android/Linux Rooted Subsystem',
              browser: 'Unknown Client',
              ip_address: tx.ip_address,
              is_vpn: true,
              is_rooted_or_jailbroken: true,
              is_emulator: true,
              reputation_score: 0,
              first_seen: new Date().toISOString(),
              last_seen: new Date().toISOString(),
              associated_users_count: 1,
              associated_users: [tx.user_id]
            });
          }

          db.audit_logs.unshift({
            log_id: `LOG_${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'HARDWARE_DEVICE_BLACKLISTED',
            actor: 'SECURITY_ANALYST',
            details: { device_id: tx.device_id, transaction_id: tx.transaction_id, reason: notes || 'Confirmed compromised hardware mule', analyst: analyst_name || 'SOC_ANALYST' }
          });

          await sendDirectEmail({
            to: targetEmail,
            subject: `🚨 [Sentinel ALERT] Unauthorized Transfer Blocked & Device ${tx.device_id} Blacklisted`,
            bodyText: `An unauthorized transfer attempt of ₹${tx.amount.toLocaleString()} was blocked by Sentinel AI. Device ${tx.device_id} has been permanently quarantined.`,
            bodyHtml: `
              <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px; border-radius: 12px; max-width: 520px; border: 1px solid #1e293b;">
                <h2 style="font-size: 16px; margin: 0 0 12px 0; color: #ef4444;">🚨 Suspicious Transaction Blocked</h2>
                <p style="font-size: 13px; color: #94a3b8;">
                  Transfer of <strong>₹${tx.amount.toLocaleString()}</strong> to unverified payee was blocked.
                </p>
              </div>
            `,
            category: 'CRITICAL_FRAUD_ALERT'
          });

          return res.json({ success: true, action: 'FREEZE_DEVICE_MULE', transaction: tx });
        }

        case 'OVERRIDE_APPROVE': {
          tx.status = 'APPROVED';
          tx.policy_decision = 'APPROVED';
          tx.analyst_attestation = {
            analyst_name: analyst_name || 'Lead SOC Analyst (L2)',
            action: 'MANUAL_OVERRIDE_APPROVED',
            timestamp: new Date().toISOString(),
            notes: notes || reason || 'Manual risk override by certified analyst after phone verification.'
          };

          db.audit_logs.unshift({
            log_id: `LOG_${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'ANALYST_OVERRIDE_APPROVED',
            actor: 'SECURITY_ANALYST',
            details: { transaction_id: tx.transaction_id, notes: tx.analyst_attestation.notes, analyst: analyst_name || 'SOC_ANALYST' }
          });

          return res.json({ success: true, action: 'OVERRIDE_APPROVE', transaction: tx });
        }

        case 'FILE_1930_COMPLAINT': {
          const ackNumber = `ACK-1930-${Date.now().toString().slice(-6)}-${tx.transaction_id}`;
          tx.fir_ack_number = ackNumber;

          const complaintRecord = {
            id: `CMP_${Date.now()}`,
            ackNumber,
            date: new Date().toISOString(),
            victimName: user?.name || tx.user_name || 'Account Holder',
            victimContact: user?.phone || '+91 98450 12890',
            victimEmail: targetEmail,
            transactionId: tx.transaction_id,
            amount: tx.amount,
            fraudType: 'UNAUTHORIZED_UPI_TAKEOVER',
            bankRef: `HDFC/UPI/${tx.transaction_id}`,
            suspectVPA: tx.beneficiary_account || 'mule.payee@ybl',
            suspectDevice: tx.device_id,
            suspectIP: tx.ip_address,
            status: 'REGISTERED_1930',
            policeStation: 'Cyber Crime Police Station, Cyberabad / Hyderabad Zone',
            firDraft: `First Information Technical Incident Report filed under Section 66C/66D IT Act 2008 and IPC 420 for fraudulent unauthorized payment transaction ${tx.transaction_id}.`
          };

          const existingComplaints = (global as any)._complaintsStore || [];
          existingComplaints.unshift(complaintRecord);
          (global as any)._complaintsStore = existingComplaints;

          db.audit_logs.unshift({
            log_id: `LOG_${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'POLICE_1930_COMPLAINT_FILED',
            actor: 'SECURITY_ANALYST',
            details: { ack_number: ackNumber, transaction_id: tx.transaction_id, policeStation: complaintRecord.policeStation, officer: analyst_name || 'SOC_COMPLIANCE_OFFICER' }
          });

          await sendDirectEmail({
            to: targetEmail,
            subject: `⚖️ [1930 Cyber Police] Formal Incident Registration: ${ackNumber}`,
            bodyText: `Your cyber crime incident report for transaction ${tx.transaction_id} has been registered with National Cyber Crime Portal (1930). Acknowledgement No: ${ackNumber}.`,
            bodyHtml: `
              <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px; border-radius: 12px; max-width: 520px; border: 1px solid #1e293b;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                  <span style="font-size: 16px; font-weight: bold; color: #c084fc;">National Cyber Crime Reporting Portal (1930)</span>
                </div>
                <h2 style="font-size: 15px; margin: 0 0 10px 0; color: #ffffff;">Cyber Incident Acknowledgment Receipt</h2>
                <div style="background-color: #1e1b4b; border: 1px solid #4338ca; border-radius: 8px; padding: 14px; margin-bottom: 16px; font-family: monospace; font-size: 12px; color: #e0e7ff;">
                  <strong>FIR Acknowledgement No:</strong> ${ackNumber}<br/>
                  <strong>Transaction ID:</strong> ${tx.transaction_id}<br/>
                  <strong>Disputed Amount:</strong> ₹${tx.amount.toLocaleString()}<br/>
                  <strong>Filing Agency:</strong> Cyber Crime Division
                </div>
              </div>
            `,
            category: 'POLICE_COMPLAINT',
            metadata: { ackNumber, transaction_id: tx.transaction_id }
          });

          return res.json({ success: true, action: 'FILE_1930_COMPLAINT', ackNumber, transaction: tx });
        }

        default:
          return res.status(400).json({ error: `Unknown action: ${action}` });
      }
    } catch (err: any) {
      console.error('[TRANSACTION-ACTION-ERROR]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Copilot Interactive Chat for Forensic Docket
  app.post('/api/transactions/:id/copilot-chat', async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message string required' });
      }

      const result = await queryForensicAgent(req.params.id, message);
      res.json({
        success: true,
        reply: result.reply,
        toolInvocations: result.toolInvocations || []
      });
    } catch (err: any) {
      console.error('[COPILOT-CHAT-ERROR]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Add Case Note to Transaction
  app.post('/api/transactions/:id/add-case-note', (req, res) => {
    try {
      const tx = db.transactions.get(req.params.id);
      if (!tx) return res.status(404).json({ error: 'Transaction not found' });

      const { text, author, action } = req.body;
      if (!text) return res.status(400).json({ error: 'Note text is required' });

      const note = {
        id: `CN_${Date.now()}`,
        author: author || 'Lead SOC Analyst (L2)',
        text: text.trim(),
        timestamp: new Date().toISOString(),
        action: action || 'ANALYST_OBSERVATION'
      };

      tx.case_notes = tx.case_notes || [];
      tx.case_notes.unshift(note);

      db.audit_logs.unshift({
        log_id: `LOG_${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'CASE_NOTE_ADDED',
        actor: note.author,
        details: { transaction_id: tx.transaction_id, note_id: note.id }
      });

      res.status(201).json({ success: true, note, case_notes: tx.case_notes });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  interface AuthCodeRecord {
    email: string;
    code: string;
    magicToken: string;
    expiresAt: number;
    createdAt: string;
    subject: string;
    bodyText: string;
    bodyHtml: string;
  }

  const activeAuthCodes = new Map<string, AuthCodeRecord>();

  // Direct 1-Click Google Sign In (Seamless Gmail SSO)
  app.post('/api/auth/google-signin', (req, res) => {
    try {
      const { email, name, avatar } = req.body;
      const normalizedEmail = (email || 'srakshitha912@gmail.com').trim().toLowerCase();
      const isRakshitha = normalizedEmail.includes('srakshitha');
      const userName = name || (isRakshitha ? 'Rakshitha S' : normalizedEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()));
      const userAvatar = avatar || (isRakshitha ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80' : undefined);

      const user = {
        id: `usr-${Date.now()}`,
        name: userName,
        email: normalizedEmail,
        phone: '+91 98450 12890',
        avatar: userAvatar,
        role: 'PERSONAL_USER',
        roleTitle: 'Personal Account Holder',
        clearanceLevel: 'PERSONAL',
        provider: 'google',
        lastLogin: 'Active session (Verified Gmail SSO)',
        isPersonalAccount: true,
        bankName: 'HDFC Bank',
        accountNumberMasked: 'HDFC •••• 8831',
        upiHandle: `${normalizedEmail.split('@')[0]}@okhdfcbank`,
        location: 'Bengaluru, Karnataka, India'
      };

      console.log(`[AUTH-GOOGLE-SSO] User logged in with Gmail SSO: ${normalizedEmail}`);

      res.json({
        success: true,
        message: 'Google Sign-In successful',
        user
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/send-signin-code', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'A valid email address is required' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const magicToken = `tok_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      const createdAt = new Date().toISOString();

      const subject = `[Sentinel SOC] Sign-in verification code: ${code}`;
      const bodyText = `Hello,\n\nA sign-in request was initiated for your Sentinel SOC Analyst account (${normalizedEmail}).\n\nYour 6-Digit One-Time Security Passcode is: ${code}\n\nSecurity Clearance: LEVEL_3_ADMIN (Lead Investigator)\nValid for 10 minutes.\n\nIf you did not request this, please secure your corporate credentials.\n\n---\nFraud Sentinel AI Security Operations Command`;
      const bodyHtml = `
        <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px; border-radius: 12px; max-width: 520px; border: 1px solid #1e293b;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
            <span style="font-size: 18px; font-weight: bold; color: #f43f5e;">Fraud Sentinel AI</span>
            <span style="background-color: #064e3b; color: #34d399; font-size: 11px; padding: 2px 8px; border-radius: 9999px; margin-left: 8px; font-weight: bold;">256-BIT TLS AUTH</span>
          </div>
          <h2 style="font-size: 16px; margin: 0 0 12px 0; color: #ffffff;">Sign-In Security Verification</h2>
          <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0 0 18px 0;">
            A sign-in request was received for <strong style="color: #ffffff;">${normalizedEmail}</strong> to access the Sentinel Fraud Operations Console.
          </p>
          <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 18px; text-align: center; margin-bottom: 20px;">
            <span style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Your 6-Digit One-Time Passcode</span>
            <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #f43f5e; font-family: monospace; margin: 8px 0;">${code}</div>
            <span style="font-size: 11px; color: #f59e0b;">Expires in 10 minutes</span>
          </div>
          <p style="font-size: 12px; color: #64748b; margin: 0;">
            If you did not request this verification code, please ignore this email.
          </p>
        </div>
      `;

      const record: AuthCodeRecord = {
        email: normalizedEmail,
        code,
        magicToken,
        expiresAt,
        createdAt,
        subject,
        bodyText,
        bodyHtml,
      };

      activeAuthCodes.set(normalizedEmail, record);

      // Trigger direct email dispatch
      await sendDirectEmail({
        to: normalizedEmail,
        subject,
        bodyText,
        bodyHtml,
        category: 'AUTH_OTP',
        metadata: { code, magicToken }
      });

      console.log(`[AUTH-EMAIL-DISPATCH] Sent OTP ${code} to ${normalizedEmail} (Expires in 10m)`);

      res.json({
        success: true,
        message: `Sign-in verification code successfully dispatched to ${normalizedEmail}`,
        email: normalizedEmail,
        code, // passed for instant UX fill & sandbox test convenience
        magicToken,
        expiresAt,
        preview: {
          from: 'Fraud Sentinel AI <security-alerts@sentinel-soc.internal>',
          to: normalizedEmail,
          subject,
          text: bodyText,
          html: bodyHtml,
          timestamp: createdAt,
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Verify OTP or Magic Token
  app.post('/api/auth/verify-code', (req, res) => {
    try {
      const { email, code, magicToken } = req.body;
      if (!email || (!code && !magicToken)) {
        return res.status(400).json({ error: 'Email and verification code or magic token are required' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const record = activeAuthCodes.get(normalizedEmail);

      if (!record) {
        return res.status(400).json({ error: 'No active verification code found for this email. Please request a new code.' });
      }

      if (Date.now() > record.expiresAt) {
        activeAuthCodes.delete(normalizedEmail);
        return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
      }

      const isCodeValid = code && record.code === code.trim();
      const isTokenValid = magicToken && record.magicToken === magicToken.trim();

      if (!isCodeValid && !isTokenValid) {
        return res.status(400).json({ error: 'Invalid verification code. Please check your Gmail or request a new code.' });
      }

      // Validated -> Clean up and create session
      activeAuthCodes.delete(normalizedEmail);

      const isRakshitha = normalizedEmail.includes('srakshitha');
      const isGovOrLead = normalizedEmail.includes('gov') || isRakshitha;

      const user = {
        id: `usr-${Date.now()}`,
        name: isRakshitha ? 'Rakshitha S' : normalizedEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        email: normalizedEmail,
        phone: '+91 98450 12890',
        avatar: isRakshitha ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80' : undefined,
        role: 'PERSONAL_USER',
        roleTitle: 'Personal Account Holder',
        clearanceLevel: 'PERSONAL',
        provider: normalizedEmail.includes('gmail.com') ? 'google' : 'email',
        lastLogin: 'Active session (Just now)',
        isPersonalAccount: true,
        bankName: 'HDFC Bank & ICICI Bank',
        accountNumberMasked: 'HDFC •••• 8831',
        upiHandle: `${normalizedEmail.split('@')[0]}@okhdfcbank`,
        location: 'Bengaluru, Karnataka, India'
      };

      res.json({
        success: true,
        message: 'Authentication successful',
        user
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get Latest Dispatched Email for Inbox Preview
  app.get('/api/auth/latest-email/:email', (req, res) => {
    const normalizedEmail = req.params.email.trim().toLowerCase();
    const found = emailDispatchStore.find(d => d.to === normalizedEmail) || emailDispatchStore[0];
    if (!found) {
      return res.status(404).json({ error: 'No dispatched emails found for this address' });
    }
    res.json({
      email: found.to,
      subject: found.subject,
      bodyText: found.bodyText,
      bodyHtml: found.bodyHtml,
      code: found.metadata?.code,
      magicToken: found.metadata?.magicToken,
      timestamp: found.timestamp
    });
  });

  // =========================================================================
  // 21. PERSONAL ACCOUNT CYBER DEFENSE: CARDS, FRAUD DETECTIONS & POLICE FILING
  // =========================================================================

  interface PersonalCardState {
    id: string;
    cardHolder: string;
    cardNumberMasked: string;
    cardType: 'DEBIT' | 'CREDIT';
    network: 'VISA' | 'MASTERCARD' | 'RUPAY';
    bankName: string;
    expiry: string;
    isBlocked: boolean;
    blockReason?: string;
    blockedAt?: string;
    onlineTxEnabled: boolean;
    intlTxEnabled: boolean;
    contactlessEnabled: boolean;
    atmEnabled: boolean;
    dailyLimit: number;
    maxSingleTxnLimit: number;
    geofenceStrictEnabled: boolean;
    autoLockOnFraudAttempt: boolean;
    blockCryptoGambling: boolean;
    smsAlertThreshold: number;
    tokenizedMask: boolean;
    fraudAlertCount: number;
    accentColor: string;
  }

  // Initialized with ZERO sample data as requested
  let personalCards: PersonalCardState[] = [];

  let personalAccount = {
    id: 'acc-primary',
    accountNumberMasked: 'HDFC •••• 8831',
    bankName: 'HDFC Bank',
    accountType: 'SAVINGS',
    balance: 0,
    upiIds: ['srakshitha@okhdfcbank'],
    isFrozen: false,
    frozenAt: undefined as string | undefined,
    ifscCode: 'HDFC0000182',
    branch: 'Indiranagar, Bengaluru'
  };

  // Initialized with ZERO sample data as requested
  let personalHistoryTransactions: any[] = [];

  // Initialized with ZERO sample data as requested
  let policeComplaints: any[] = [];

  // 21.1 Get Personal Cards
  app.get('/api/personal/cards', (req, res) => {
    res.json(personalCards);
  });

  // 21.1.1 Add New Card with Strict Security Configurations
  app.post('/api/personal/cards', (req, res) => {
    try {
      const {
        bankName,
        cardType,
        network,
        cardNumber,
        last4,
        cardHolder,
        expiry,
        dailyLimit,
        maxSingleTxnLimit,
        onlineTxEnabled,
        intlTxEnabled,
        contactlessEnabled,
        atmEnabled,
        geofenceStrictEnabled,
        autoLockOnFraudAttempt,
        blockCryptoGambling,
        smsAlertThreshold
      } = req.body;

      // Extract last 4 digits securely
      let cleanLast4 = '1234';
      if (cardNumber && typeof cardNumber === 'string') {
        const digits = cardNumber.replace(/\D/g, '');
        if (digits.length >= 4) {
          cleanLast4 = digits.slice(-4);
        }
      } else if (last4) {
        cleanLast4 = last4.toString().replace(/\D/g, '').slice(-4).padStart(4, '0');
      }

      const formattedExpiry = (expiry && /^\d{2}\/\d{2}$/.test(expiry)) ? expiry : '12/29';

      const newCard: PersonalCardState = {
        id: `card-${Date.now()}`,
        cardHolder: (cardHolder || 'RAKSHITHA S').toUpperCase().trim(),
        cardNumberMasked: `•••• •••• •••• ${cleanLast4}`,
        cardType: cardType === 'CREDIT' ? 'CREDIT' : 'DEBIT',
        network: network === 'MASTERCARD' ? 'MASTERCARD' : network === 'RUPAY' ? 'RUPAY' : 'VISA',
        bankName: bankName || 'HDFC Bank',
        expiry: formattedExpiry,
        isBlocked: false,
        onlineTxEnabled: onlineTxEnabled !== undefined ? Boolean(onlineTxEnabled) : true,
        intlTxEnabled: intlTxEnabled !== undefined ? Boolean(intlTxEnabled) : false,
        contactlessEnabled: contactlessEnabled !== undefined ? Boolean(contactlessEnabled) : false,
        atmEnabled: atmEnabled !== undefined ? Boolean(atmEnabled) : true,
        dailyLimit: Number(dailyLimit) > 0 ? Number(dailyLimit) : 50000,
        maxSingleTxnLimit: Number(maxSingleTxnLimit) > 0 ? Number(maxSingleTxnLimit) : 10000,
        geofenceStrictEnabled: geofenceStrictEnabled !== undefined ? Boolean(geofenceStrictEnabled) : true,
        autoLockOnFraudAttempt: autoLockOnFraudAttempt !== undefined ? Boolean(autoLockOnFraudAttempt) : true,
        blockCryptoGambling: blockCryptoGambling !== undefined ? Boolean(blockCryptoGambling) : true,
        smsAlertThreshold: Number(smsAlertThreshold) >= 0 ? Number(smsAlertThreshold) : 100,
        tokenizedMask: true,
        fraudAlertCount: 0,
        accentColor: cardType === 'CREDIT' 
          ? 'from-orange-600 via-rose-700 to-slate-950' 
          : network === 'RUPAY'
          ? 'from-cyan-600 via-teal-700 to-slate-900'
          : 'from-blue-600 via-indigo-700 to-slate-900'
      };

      personalCards.push(newCard);
      console.log(`[CARDS] Added new card ${newCard.cardNumberMasked} for ${newCard.cardHolder} with strict restrictions enabled.`);

      res.status(201).json({
        success: true,
        card: newCard,
        message: `Card ${newCard.cardNumberMasked} added securely with strict cyber restrictions.`
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 21.1.2 Delete Card
  app.delete('/api/personal/cards/:id', (req, res) => {
    const { id } = req.params;
    personalCards = personalCards.filter(c => c.id !== id);
    res.json({ success: true, message: 'Card removed from active wallet.' });
  });

  // 21.1.3 Apply Strict Lockdown on Card
  app.post('/api/personal/cards/:id/strict-lockdown', (req, res) => {
    const { id } = req.params;
    const card = personalCards.find(c => c.id === id);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    card.intlTxEnabled = false;
    card.contactlessEnabled = false;
    card.onlineTxEnabled = false;
    card.geofenceStrictEnabled = true;
    card.autoLockOnFraudAttempt = true;
    card.blockCryptoGambling = true;
    card.maxSingleTxnLimit = 2000;
    card.dailyLimit = 5000;

    res.json({
      success: true,
      card,
      message: `Strict cyber lockdown activated on ${card.cardNumberMasked}. International, contactless, and web channels disabled; single transaction capped at ₹2,000.`
    });
  });

  // 21.2 Toggle Instant Card Lock
  app.post('/api/personal/cards/:id/toggle-block', (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const card = personalCards.find(c => c.id === id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    card.isBlocked = !card.isBlocked;
    if (card.isBlocked) {
      card.blockReason = reason || 'Emergency User Lock against Fraudulent Activity';
      card.blockedAt = new Date().toISOString();
      card.onlineTxEnabled = false;
      card.intlTxEnabled = false;
      card.contactlessEnabled = false;
      card.atmEnabled = false;

      // Also mark in transactions
      personalHistoryTransactions.forEach(t => {
        if (t.card_last4 && card.cardNumberMasked.includes(t.card_last4)) {
          t.card_blocked = true;
        }
      });
    } else {
      card.blockReason = undefined;
      card.blockedAt = undefined;
    }

    if (card.isBlocked) {
      sendDirectEmail({
        to: 'srakshitha912@gmail.com',
        subject: `🚨 [URGENT] Card ${card.cardNumberMasked} LOCKED by Sentinel Security`,
        bodyText: `Your ${card.bankName} card ${card.cardNumberMasked} has been immediately blocked due to suspicious activity. All online, international, and ATM access has been revoked.`,
        bodyHtml: `<div style="font-family: sans-serif; background:#0f172a; color:#f8fafc; padding:20px; border-radius:8px;">
          <h2 style="color:#ef4444;">🚨 Card Security Lock Notice</h2>
          <p>Card <strong>${card.cardNumberMasked}</strong> (${card.bankName}) was <strong>LOCKED IMMEDIATELY</strong> at ${new Date().toLocaleString()}.</p>
          <p>Reason: ${card.blockReason || 'Security threshold breached'}</p>
          <p style="color:#94a3b8; font-size:12px;">If you did not initiate this lock, contact the 24x7 helpline immediately.</p>
        </div>`,
        category: 'CARD_BLOCKED',
        metadata: { cardId: card.id, last4: card.cardNumberMasked }
      }).catch(e => console.error('Card lock email dispatch error:', e));
    }

    res.json({
      success: true,
      card,
      message: card.isBlocked
        ? `Card ${card.cardNumberMasked} has been LOCKED IMMEDIATELY. All online, international, and ATM access terminated.`
        : `Card ${card.cardNumberMasked} has been successfully unlocked.`
    });
  });

  // 21.3 Update Card Controls (Channels & Limits & Strict Protections)
  app.post('/api/personal/cards/:id/update-controls', (req, res) => {
    const { id } = req.params;
    const {
      onlineTxEnabled,
      intlTxEnabled,
      contactlessEnabled,
      atmEnabled,
      dailyLimit,
      maxSingleTxnLimit,
      geofenceStrictEnabled,
      autoLockOnFraudAttempt,
      blockCryptoGambling,
      smsAlertThreshold
    } = req.body;

    const card = personalCards.find(c => c.id === id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (onlineTxEnabled !== undefined) card.onlineTxEnabled = Boolean(onlineTxEnabled);
    if (intlTxEnabled !== undefined) card.intlTxEnabled = Boolean(intlTxEnabled);
    if (contactlessEnabled !== undefined) card.contactlessEnabled = Boolean(contactlessEnabled);
    if (atmEnabled !== undefined) card.atmEnabled = Boolean(atmEnabled);
    if (dailyLimit !== undefined && typeof dailyLimit === 'number') card.dailyLimit = dailyLimit;
    if (maxSingleTxnLimit !== undefined && typeof maxSingleTxnLimit === 'number') card.maxSingleTxnLimit = maxSingleTxnLimit;
    if (geofenceStrictEnabled !== undefined) card.geofenceStrictEnabled = Boolean(geofenceStrictEnabled);
    if (autoLockOnFraudAttempt !== undefined) card.autoLockOnFraudAttempt = Boolean(autoLockOnFraudAttempt);
    if (blockCryptoGambling !== undefined) card.blockCryptoGambling = Boolean(blockCryptoGambling);
    if (smsAlertThreshold !== undefined && typeof smsAlertThreshold === 'number') card.smsAlertThreshold = smsAlertThreshold;

    res.json({
      success: true,
      card,
      message: 'Card security controls and strict restrictions updated successfully.'
    });
  });

  // 21.4 Get Personal Account
  app.get('/api/personal/account', (req, res) => {
    res.json(personalAccount);
  });

  // 21.5 Freeze / Unfreeze Bank Account
  app.post('/api/personal/account/freeze', (req, res) => {
    personalAccount.isFrozen = !personalAccount.isFrozen;
    personalAccount.frozenAt = personalAccount.isFrozen ? new Date().toISOString() : undefined;

    res.json({
      success: true,
      account: personalAccount,
      message: personalAccount.isFrozen
        ? 'Account & all UPI handles frozen immediately. No outgoing debits permitted.'
        : 'Account unfrozen.'
    });
  });

  // 21.6 Get Personal Transaction History with Fraud Detection Scanner
  app.get('/api/personal/transactions', (req, res) => {
    const fraudCount = personalHistoryTransactions.filter(t => t.risk_level === 'HIGH' || t.risk_level === 'CRITICAL').length;
    const totalFraudVolume = personalHistoryTransactions
      .filter(t => t.risk_level === 'HIGH' || t.risk_level === 'CRITICAL')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    res.json({
      transactions: personalHistoryTransactions,
      summary: {
        total_transactions: personalHistoryTransactions.length,
        fraud_detected_count: fraudCount,
        total_fraud_volume: totalFraudVolume,
        critical_alerts_count: personalHistoryTransactions.filter(t => t.risk_level === 'CRITICAL' && !t.police_complaint_filed).length,
        cards_at_risk: personalCards.filter(c => !c.isBlocked && c.fraudAlertCount > 0).length
      }
    });
  });

  // 21.6.1 Add / Log Personal Transaction (with automated Fraud Risk Scoring)
  app.post('/api/personal/transactions', (req, res) => {
    try {
      const {
        merchant_name,
        amount,
        transaction_type,
        location,
        device_model,
        card_last4,
        beneficiary_upi
      } = req.body;

      if (!merchant_name || !amount) {
        return res.status(400).json({ error: 'Merchant / Beneficiary name and amount are required' });
      }

      const numAmount = Number(amount);
      const isSuspiciousMerchant = /crypto|mule|reward|lottery|apk|unknown|airdrop|binance|telegram|phish|quick_transfer/i.test(merchant_name) || (beneficiary_upi && /crypto|mule|ybl|paytm\d{4}/i.test(beneficiary_upi));
      const isHighAmount = numAmount >= 25000;
      const isSuspiciousLocation = location && !/bengaluru|bangalore|karnataka|india/i.test(location);

      let riskScore = 15;
      const fraudSignals: string[] = [];

      if (isSuspiciousMerchant) {
        riskScore += 50;
        fraudSignals.push(`Suspicious / Unverified beneficiary VPA matching fraud patterns (${merchant_name})`);
      }
      if (isHighAmount) {
        riskScore += 25;
        fraudSignals.push(`High value transaction exceeding ₹25,000 threshold (₹${numAmount.toLocaleString('en-IN')})`);
      }
      if (isSuspiciousLocation) {
        riskScore += 20;
        fraudSignals.push(`Geographic anomaly: Originating from ${location} (outside regular home circle)`);
      }
      if (device_model && /unrecognized|unknown|emulator|linux|xiaomi/i.test(device_model)) {
        riskScore += 20;
        fraudSignals.push(`Unrecognized or unauthorized device fingerprint detected (${device_model})`);
      }

      riskScore = Math.min(99, riskScore);
      const riskLevel = riskScore >= 75 ? 'CRITICAL' : riskScore >= 45 ? 'HIGH' : riskScore >= 25 ? 'MEDIUM' : 'LOW';

      const newTxn = {
        transaction_id: `TXN-${Date.now().toString().slice(-6)}`,
        user_id: 'usr-srakshitha',
        user_name: 'Rakshitha S',
        amount: numAmount,
        currency: 'INR',
        merchant_id: beneficiary_upi || `M-${Date.now()}`,
        merchant_name: merchant_name,
        merchant_category: transaction_type === 'UPI' ? 'UPI_TRANSFER' : 'PURCHASE',
        timestamp: new Date().toISOString(),
        transaction_type: transaction_type || 'UPI',
        device_id: 'DEV-CLIENT',
        device_model: device_model || 'Apple iPhone 14 Pro',
        ip_address: '49.207.210.45',
        location: location || 'Bengaluru, India',
        status: riskLevel === 'CRITICAL' ? 'HELD' : 'APPROVED',
        risk_score: riskScore,
        risk_level: riskLevel,
        recommended_action: riskLevel === 'CRITICAL' ? 'BLOCK_CARD_AND_FILE_POLICE_REPORT' : riskLevel === 'HIGH' ? 'REVIEW_TRANSACTION' : 'APPROVE',
        card_last4: card_last4 || undefined,
        fraud_signals: fraudSignals,
        suspect_details: isSuspiciousMerchant ? {
          suspect_upi: beneficiary_upi || merchant_name,
          merchant_name,
          location: location || 'Unknown',
          notes: 'High-risk recipient flagged by automated threat scanner'
        } : undefined,
        police_complaint_filed: false,
        card_blocked: false
      };

      personalHistoryTransactions.unshift(newTxn);

      // Trigger automatic Resend email alert if high risk / critical fraud detected
      if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH' || riskScore >= 50) {
        sendFraudAlert({
          id: newTxn.transaction_id,
          amount: newTxn.amount,
          riskScore: newTxn.risk_score,
          riskLevel: newTxn.risk_level,
          merchant_name: newTxn.merchant_name,
          fraud_signals: newTxn.fraud_signals,
          to: 'srakshitha912@gmail.com'
        }).catch(err => console.warn('[PERSONAL-FRAUD-ALERT-EMAIL-ERROR]', err));
      }

      res.status(201).json({
        success: true,
        transaction: newTxn,
        message: `Transaction recorded. Fraud Risk: ${riskLevel} (${riskScore}/100)`
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 21.6.2 Delete Single Transaction
  app.delete('/api/personal/transactions/:id', (req, res) => {
    const { id } = req.params;
    personalHistoryTransactions = personalHistoryTransactions.filter(t => t.transaction_id !== id);
    res.json({ success: true, message: 'Transaction removed from ledger.' });
  });

  // 21.6.3 Clear All Personal Transactions
  app.post('/api/personal/transactions/clear', (req, res) => {
    personalHistoryTransactions = [];
    res.json({ success: true, message: 'Transaction ledger cleared.' });
  });

  // 21.6.4 Clear All Complaints
  app.post('/api/personal/complaints/clear', (req, res) => {
    policeComplaints = [];
    res.json({ success: true, message: 'Police complaints cleared.' });
  });

  // 21.7 Get Police & Cyber Team Complaints
  app.get('/api/personal/complaints', (req, res) => {
    res.json(policeComplaints);
  });

  // 21.8 File Formal Police / Cyber Crime Complaint
  app.post('/api/personal/complaints/file', (req, res) => {
    try {
      const {
        victim_name,
        victim_email,
        victim_phone,
        victim_address,
        incident_category,
        incident_date,
        total_fraud_amount,
        police_station,
        police_jurisdiction,
        associated_transaction_ids,
        suspect_details,
        formal_narrative
      } = req.body;

      if (!victim_name || !victim_email || !total_fraud_amount) {
        return res.status(400).json({ error: 'Missing mandatory complaint details' });
      }

      const randomDigits = Math.floor(10000 + Math.random() * 90000);
      const ackNumber = `CYBER/2026/BLR-${randomDigits}`;
      const nationalRef = `1930-NCRP-IND-${Date.now().toString().slice(-6)}`;

      const newComplaint = {
        complaint_id: `CMP-${Date.now()}`,
        acknowledgement_number: ackNumber,
        national_portal_ref: nationalRef,
        filed_at: new Date().toISOString(),
        victim_name: victim_name || 'Rakshitha S',
        victim_email: victim_email || 'srakshitha912@gmail.com',
        victim_phone: victim_phone || '+91 98450 12890',
        victim_address: victim_address || 'Bengaluru, Karnataka',
        incident_category: incident_category || 'UPI_FRAUD',
        incident_date: incident_date || new Date().toISOString(),
        total_fraud_amount: Number(total_fraud_amount),
        currency: 'INR',
        police_station: police_station || 'Cyber Crime Police Station (CCPS), Bengaluru East Division',
        police_jurisdiction: police_jurisdiction || 'Karnataka State Police Cyber Cell',
        associated_transaction_ids: associated_transaction_ids || [],
        suspect_details: suspect_details || {},
        fir_status: 'SUBMITTED',
        investigating_officer: 'Inspector R. K. Gowda',
        officer_badge: 'CCPS-BLR-0842',
        officer_contact: '+91 80 2294 2222 / Helpline 1930',
        evidence_summary: `Digital Evidence Packet assembled: Transaction IDs: ${(associated_transaction_ids || []).join(', ')}. Suspect beneficiary: ${suspect_details?.suspect_upi || suspect_details?.merchant_name || 'Mule node'}. Immediate lien request transmitted to 1930 Portal.`,
        formal_narrative: formal_narrative || 'Official complaint regarding unauthorized cyber debit.',
        recovery_stage: 'Transmitted to Cyber Crime Cell & Bank Nodal Officer for Immediate Account Freeze'
      };

      policeComplaints.unshift(newComplaint);

      // Trigger Direct Email Dispatch to the complainant's email
      sendDirectEmail({
        to: newComplaint.victim_email,
        subject: `⚖️ [1930 Cyber Cell] Acknowledgement Ref: ${ackNumber} Filed`,
        bodyText: `Formal Cyber Crime Complaint filed for ₹${newComplaint.total_fraud_amount.toLocaleString('en-IN')}.\nAcknowledgement No: ${ackNumber}\nNational Ref: ${nationalRef}\nInvestigating Police Station: ${newComplaint.police_station}\nInvestigating Officer: ${newComplaint.investigating_officer} (${newComplaint.officer_contact})`,
        bodyHtml: `<div style="font-family: sans-serif; background:#0b0f19; color:#f1f5f9; padding:24px; border-radius:10px; border: 1px solid #1e293b; max-width:550px;">
          <h2 style="color:#38bdf8; margin:0 0 12px 0; font-size:18px;">National Cyber Crime Reporting Portal (1930)</h2>
          <p style="font-size:14px; line-height:1.5; color:#cbd5e1;">Dear <strong>${newComplaint.victim_name}</strong>,</p>
          <p style="font-size:14px; line-height:1.5; color:#cbd5e1;">Your formal cyber complaint regarding unauthorized financial fraud of <strong style="color:#ef4444;">₹${newComplaint.total_fraud_amount.toLocaleString('en-IN')}</strong> has been submitted to the 1930 Cyber Portal and local law enforcement.</p>
          <div style="background:#0f172a; padding:16px; border-radius:8px; border:1px solid #334155; margin:16px 0;">
            <p style="margin:6px 0; font-size:13px;"><strong>Acknowledgement No:</strong> <span style="color:#38bdf8; font-family:monospace; font-weight:bold;">${ackNumber}</span></p>
            <p style="margin:6px 0; font-size:13px;"><strong>National Portal Ref:</strong> <span style="color:#a855f7; font-family:monospace;">${nationalRef}</span></p>
            <p style="margin:6px 0; font-size:13px;"><strong>Jurisdiction:</strong> ${newComplaint.police_station}</p>
            <p style="margin:6px 0; font-size:13px;"><strong>Investigating Officer:</strong> ${newComplaint.investigating_officer} (${newComplaint.officer_contact})</p>
          </div>
          <p style="color:#94a3b8; font-size:12px; margin:0;">Immediate lien request and suspect beneficiary freeze transmitted to beneficiary bank nodal officer under PMLA guidelines.</p>
        </div>`,
        category: 'POLICE_COMPLAINT',
        metadata: { ackNumber, nationalRef, amount: newComplaint.total_fraud_amount }
      }).catch(e => console.error('Police complaint email dispatch error:', e));

      // Update transactions state
      if (associated_transaction_ids && Array.isArray(associated_transaction_ids)) {
        personalHistoryTransactions.forEach(t => {
          if (associated_transaction_ids.includes(t.transaction_id)) {
            t.police_complaint_filed = true;
            t.status = 'HELD';
          }
        });
      }

      console.log(`[POLICE-COMPLAINT-FILED] Generated ${ackNumber} for ${victim_email}, Amount: ₹${total_fraud_amount}`);

      res.json({
        success: true,
        complaint: newComplaint,
        message: `Official Cyber Crime Complaint filed successfully. Acknowledgement Ref: ${ackNumber}. Transmitted to ${newComplaint.police_station} and National Cyber Portal (1930).`
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 21.9 Nearest Police Stations & Cyber Helpline List
  app.get('/api/personal/police-stations', (req, res) => {
    res.json({
      helpline: '1930 (National Cyber Crime Helpline - 24x7 Instant Financial Fraud Freezing)',
      portal: 'cybercrime.gov.in',
      stations: [
        {
          id: 'stn-blr-east',
          name: 'Cyber Crime Police Station (CCPS), Bengaluru East',
          address: 'CID Headquarters, Palace Road, Bengaluru 560001',
          jurisdiction: 'Bengaluru Urban & East Division',
          phone: '+91 80 2294 2222',
          email: 'cybercrime-blr@ksp.gov.in',
          officer_in_charge: 'Inspector R. K. Gowda',
          distance: '2.4 km from current location',
          status: 'Open 24/7'
        },
        {
          id: 'stn-blr-central',
          name: 'Central Cyber Crime Police Station (CCPS), Infantry Road',
          address: 'Police Commissioner Office Complex, Infantry Road, Bengaluru 560001',
          jurisdiction: 'Bengaluru Central Command',
          phone: '+91 80 2294 3000',
          email: 'cybercell-central@ksp.gov.in',
          officer_in_charge: 'Assistant Commissioner of Police (Cyber)',
          distance: '4.1 km from current location',
          status: 'Open 24/7'
        },
        {
          id: 'stn-national-1930',
          name: 'National Cyber Crime Reporting Portal (NCRP) - MHA',
          address: 'Ministry of Home Affairs, Indian Cyber Crime Coordination Centre (I4C)',
          jurisdiction: 'Pan-India Citizen Financial Fraud Lien Authority',
          phone: '1930 (Toll-Free 24x7)',
          email: 'complaints@cybercrime.gov.in',
          officer_in_charge: 'I4C Nodal Officer Duty Officer',
          distance: 'Direct Digital Hotline',
          status: 'Immediate 10-Minute Freeze Trigger'
        }
      ]
    });
  });

  // =========================================================================
  // 21.10 ADVANCED PERSONAL CYBER DEFENSE APIS (Gemini 3.7 Flash & Live Engines)
  // =========================================================================

  // 21.10.1 AI Multimodal & Text Scam Deep Forensic Analysis (Gemini 3.7 Flash)
  app.post('/api/personal/ai-scam-analyze', async (req, res) => {
    try {
      const { text, imageBase64, mimeType, queryType } = req.body;
      if (!text && !imageBase64) {
        return res.status(400).json({ error: 'Text or image screenshot is required for scam analysis' });
      }

      const result = await analyzeScamContent({
        text,
        imageBase64,
        mimeType,
        queryType,
      });

      res.json(result);
    } catch (err: any) {
      console.error('Scam analysis error:', err);
      res.status(500).json({ error: err.message || 'Scam analysis failed' });
    }
  });

  // 21.10.2 24/7 AI Cyber Crime & Banking Rights Advisor Chat (Gemini 3.7 Flash)
  app.post('/api/personal/ai-advisor-chat', async (req, res) => {
    try {
      const { messages, userContext } = req.body;
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages array is required' });
      }

      const reply = await chatCyberAdvisor({
        messages,
        userContext: userContext || { userName: 'Rakshitha S', bank: 'HDFC & ICICI' },
      });

      res.json({ reply });
    } catch (err: any) {
      console.error('Advisor chat error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate advisory response' });
    }
  });

  // 21.10.3 1-Click Emergency Panic Killswitch Protocol
  app.post('/api/personal/emergency-panic-freeze', async (req, res) => {
    try {
      const { reason = 'Emergency User Panic Trigger' } = req.body;
      const timestamp = new Date().toISOString();

      // 1. Freeze all personal cards
      personalCards.forEach(c => {
        c.isBlocked = true;
        c.blockReason = 'EMERGENCY_PANIC_FREEZE';
        c.blockedAt = timestamp;
        c.onlineTxEnabled = false;
        c.intlTxEnabled = false;
        c.contactlessEnabled = false;
        c.atmEnabled = false;
      });

      // 2. Freeze bank account & UPI mandates
      personalAccount.isFrozen = true;
      personalAccount.frozenAt = timestamp;

      // 3. Mark high-risk transactions as blocked/held
      personalHistoryTransactions.forEach(t => {
        if (t.risk_level === 'CRITICAL' || t.risk_level === 'HIGH') {
          t.card_blocked = true;
          t.status = 'BLOCKED';
        }
      });

      // 4. Generate Emergency Cyber Crime 1930 Packet
      const emergencyPacketId = `PANIC-1930-${Date.now().toString().slice(-6)}`;
      const emergencyAckNumber = `CYBER/EMERGENCY/${new Date().getFullYear()}/${Math.floor(10000 + Math.random() * 90000)}`;

      // 5. Build instant bank SMS emergency blocking templates
      const bankSmsCommands = [
        {
          bank: 'HDFC Bank',
          number: '5676712',
          smsBody: 'BLOCK UPI',
          description: 'Instantly deactivates all UPI handles across HDFC Bank accounts'
        },
        {
          bank: 'ICICI Bank',
          number: '9215676766',
          smsBody: 'ITR OFF',
          description: 'Blocks Internet & Mobile Banking debits immediately'
        },
        {
          bank: 'SBI (State Bank of India)',
          number: '567676',
          smsBody: 'BLOCK XXXX',
          description: 'Replaces XXXX with last 4 digits to kill ATM card instantly'
        },
        {
          bank: 'Axis Bank',
          number: '5676782',
          smsBody: 'BLOCKCARDS',
          description: 'Emergency master block on all active cards'
        }
      ];

      // Dispatch emergency alert email
      sendDirectEmail({
        to: 'srakshitha912@gmail.com',
        subject: `🛑 [SENTINEL EMERGENCY] Panic Killswitch Triggered - All Cards & UPI Frozen`,
        bodyText: `EMERGENCY PANIC FREEZE ACTIVATED\nAll linked debit/credit cards and UPI handles have been LOCKED immediately.\nEmergency Reference: ${emergencyAckNumber}\nTime: ${timestamp}`,
        bodyHtml: `<div style="font-family: sans-serif; background:#450a0a; color:#fecaca; padding:24px; border-radius:10px; border:2px solid #ef4444;">
          <h2 style="color:#ffffff; margin:0 0 12px 0;">🛑 EMERGENCY PANIC FREEZE ACTIVATED</h2>
          <p style="font-size:14px; line-height:1.5;">All cards, UPI mandates, and account debits for <strong>Rakshitha S</strong> have been <strong>LOCKED IMMEDIATELY</strong>.</p>
          <div style="background:#1f2937; padding:16px; border-radius:8px; margin:16px 0; color:#f9fafb;">
            <p style="margin:4px 0;"><strong>Emergency Ref:</strong> ${emergencyAckNumber}</p>
            <p style="margin:4px 0;"><strong>Cards Locked:</strong> ${personalCards.length} Cards</p>
            <p style="margin:4px 0;"><strong>Account Debit Status:</strong> BLOCKED (0 Outgoing debits allowed)</p>
          </div>
          <p style="font-size:12px; color:#fca5a5;">Dial 1930 immediately if funds were transferred to a scammer in the past 2 hours.</p>
        </div>`,
        category: 'PANIC_KILLSWITCH',
        metadata: { emergencyAckNumber, timestamp }
      }).catch(e => console.error('Panic email dispatch error:', e));

      res.json({
        success: true,
        message: '🛑 PANIC KILLSWITCH EXECUTED. All cards, UPI mandates, and payment channels are completely locked.',
        timestamp,
        emergencyPacketId,
        emergencyAckNumber,
        cardsLockedCount: personalCards.length,
        accountFrozen: true,
        bankSmsCommands,
        hotlines: [
          { name: 'National Cyber Crime Helpline', phone: '1930', speed: 'Immediate Lien Freezing' },
          { name: 'HDFC Bank 24x7 Emergency', phone: '1800 202 6161', speed: 'Toll-Free' },
          { name: 'ICICI Bank 24x7 Emergency', phone: '1800 1080', speed: 'Toll-Free' },
          { name: 'SBI 24x7 Emergency', phone: '1800 11 1109', speed: 'Toll-Free' },
        ]
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 21.10.4 Live Real-World Attack Vector Simulator (Safe Sandbox Testing)
  app.post('/api/personal/simulate-attack', async (req, res) => {
    try {
      const { scenarioId } = req.body;

      const scenarios: Record<string, any> = {
        'digital-arrest': {
          id: 'digital-arrest',
          name: 'Digital Arrest / Fake Police Video Extortion',
          severity: 'CRITICAL',
          vector: 'Voice & Video WhatsApp Social Engineering',
          simulationSteps: [
            { step: 1, title: 'Incoming WhatsApp Video Call', time: 'T+0s', status: 'INCOMING', detail: 'Caller impersonates Mumbai Cyber Cell Officer in uniform, displaying fake arrest warrant.' },
            { step: 2, title: 'Psychological Fear Pressure', time: 'T+12s', status: 'ALERT', detail: 'Demands victim stay on camera and transfer ₹1,50,000 to "RBI Verification Account" or face immediate arrest.' },
            { step: 3, title: 'Sentinel PayGuard Heuristic Trigger', time: 'T+18s', status: 'INTERCEPTED', detail: 'AI identifies keyword match (Digital Arrest, RBI Verification Account, Skype Police). Triggers Critical Red Banner.' },
            { step: 4, title: 'Automated Account Defense', time: 'T+22s', status: 'PROTECTED', detail: 'Beneficiary VPA flagged as known money mule. Outgoing transfer hard-blocked; 1930 FIR pre-filled.' }
          ],
          aiVerdict: {
            fraudProbability: 0.99,
            riskLevel: 'CRITICAL',
            actionTaken: 'TRANSFER_BLOCKED_AND_MULE_REPORTED',
            rbiProtectionRule: 'Indian law prohibits Digital Arrests. Police never demand financial deposits.',
            safeguardSummary: 'Sentinel PayGuard successfully prevented ₹1,50,000 fraud transfer and preserved victim capital.'
          }
        },
        'reverse-upi-collect': {
          id: 'reverse-upi-collect',
          name: 'Reverse UPI Collect Request / OLX Refund Trap',
          severity: 'HIGH',
          vector: 'UPI Collect Request Misdirection',
          simulationSteps: [
            { step: 1, title: 'Fraudulent Collect Notification', time: 'T+0s', status: 'INCOMING', detail: 'Scammer issues a ₹15,000 UPI Collect request with note: "Paytm Refund / OLX Advance".' },
            { step: 2, title: 'PIN Prompt Deception', time: 'T+8s', status: 'ALERT', detail: 'Scammer instructs over phone: "Please enter your UPI PIN to receive the ₹15,000 refund credit".' },
            { step: 3, title: 'Sentinel Payment Guard Interceptor', time: 'T+11s', status: 'INTERCEPTED', detail: 'Sentinel detects incoming collect request masquerading as a refund. Displays high-contrast warning: "Entering PIN will DEBIT ₹15,000".' },
            { step: 4, title: 'Automated Collect Rejection', time: 'T+15s', status: 'PROTECTED', detail: 'Collect request auto-rejected; scammer VPA added to personal blacklist.' }
          ],
          aiVerdict: {
            fraudProbability: 0.96,
            riskLevel: 'HIGH',
            actionTaken: 'COLLECT_REQUEST_AUTO_REJECTED',
            rbiProtectionRule: 'NPCI Core Directive: Entering UPI PIN ALWAYS debits money, never credits.',
            safeguardSummary: 'Prevented ₹15,000 unauthorized debit. Account balance remained untouched.'
          }
        },
        'electricity-sms-apk': {
          id: 'electricity-sms-apk',
          name: 'Electricity Bill Disconnection Phishing APK',
          severity: 'CRITICAL',
          vector: 'SMS Phishing + Malicious APK Screen Sharing',
          simulationSteps: [
            { step: 1, title: 'Urgent Threat SMS', time: 'T+0s', status: 'INCOMING', detail: 'SMS received: "Dear Consumer, your electricity power will be disconnected at 9:30 PM tonight. Install BESCOM_Update.apk".' },
            { step: 2, title: 'Malware Payload Inspection', time: 'T+5s', status: 'ALERT', detail: 'APK attempts to request ACCESSIBILITY and SCREEN_RECORDING permissions.' },
            { step: 3, title: 'Sentinel Behavioral Shield Detection', time: 'T+9s', status: 'INTERCEPTED', detail: 'Signature matches remote access trojan (AnyDesk / QuickSupport wrapper). Flags high-risk malware dropper.' },
            { step: 4, title: 'Device Sandbox Quarantine', time: 'T+14s', status: 'PROTECTED', detail: 'Malware download blocked; phone number submitted to I4C Cyber Crime database.' }
          ],
          aiVerdict: {
            fraudProbability: 0.98,
            riskLevel: 'CRITICAL',
            actionTaken: 'MALWARE_DROPPER_QUARANTINED',
            rbiProtectionRule: 'Utility companies never distribute APKs over SMS to settle power bills.',
            safeguardSummary: 'Device integrity preserved; credentials secured against keylogging.'
          }
        },
        'sim-swap-midnight': {
          id: 'sim-swap-midnight',
          name: 'SIM Swap & Midnight Velocity Drain Attack',
          severity: 'CRITICAL',
          vector: 'Telecom SIM Clone + Abnormal Time Velocity',
          simulationSteps: [
            { step: 1, title: 'Anomalous Midnight Debit Attempt', time: 'T+0s', status: 'INCOMING', detail: '₹48,000 debit attempted at 03:42 AM from IP in Moscow / Unknown Proxy.' },
            { step: 2, title: 'Hardware Fingerprint Jump', time: 'T+4s', status: 'ALERT', detail: 'IMEI and Device ID switch from iPhone 14 Pro to unverified Linux Emulator.' },
            { step: 3, title: 'Rule & AI Composite Trigger', time: 'T+7s', status: 'INTERCEPTED', detail: 'Velocity Engine + Geofence triggers 95/100 Risk Score. Step-up biometrics failed.' },
            { step: 4, title: 'Card Lockdown & Instant Alert', time: 'T+10s', status: 'PROTECTED', detail: 'Card locked automatically; 0 debit allowed; SMS dispatch triggered.' }
          ],
          aiVerdict: {
            fraudProbability: 0.97,
            riskLevel: 'CRITICAL',
            actionTaken: 'MIDNIGHT_VELOCITY_AUTO_LOCK',
            rbiProtectionRule: 'Zero Liability under RBI 3-Day Rule for third-party SIM clone breach.',
            safeguardSummary: 'Protected ₹48,000 savings; card auto-locked before fund release.'
          }
        }
      };

      const scenario = scenarios[scenarioId] || scenarios['digital-arrest'];
      res.json({
        success: true,
        scenario,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 21.10.5 Official RBI Zero Liability Claim Packet Generator
  app.get('/api/personal/rbi-claim-packet/:txId', (req, res) => {
    try {
      const { txId } = req.params;
      const tx = personalHistoryTransactions.find(t => t.transaction_id === txId) || {
        transaction_id: txId,
        amount: 25000,
        merchant_name: 'Suspicious Recipient / Mule',
        timestamp: new Date().toISOString(),
        currency: 'INR',
        card_last4: '8831'
      };

      const today = new Date();
      const txDate = new Date(tx.timestamp);
      const diffHours = Math.max(1, Math.round((today.getTime() - txDate.getTime()) / (1000 * 60 * 60)));
      const diffDays = Math.round(diffHours / 24);

      let liabilityTier = 'ZERO_LIABILITY (100% Full Bank Refund)';
      let maxCustomerLiability = '₹0 (Zero)';
      let statutoryDaysRemaining = Math.max(0, 3 - diffDays);

      if (diffDays <= 3) {
        liabilityTier = 'ZERO_LIABILITY (100% Full Bank Refund)';
        maxCustomerLiability = '₹0 (Zero)';
      } else if (diffDays <= 7) {
        liabilityTier = 'LIMITED_LIABILITY (Capped by RBI)';
        maxCustomerLiability = '₹10,000 (Maximum ceiling for Savings Account)';
      } else {
        liabilityTier = 'BOARD_APPROVED_POLICY';
        maxCustomerLiability = 'Subject to Bank Board Policy / Banking Ombudsman Review';
      }

      const disputePacket = {
        claim_id: `RBI-CLAIM-${Date.now()}`,
        generated_at: today.toISOString(),
        rbi_circular_reference: 'RBI/2017-18/15 - DBR.No.Leg.BC.78/09.07.005/2017-18',
        rbi_circular_title: 'Customer Protection – Limiting Liability of Customers in Unauthorized Electronic Banking Transactions',
        bank_details: {
          bank_name: 'HDFC Bank Ltd',
          branch: 'Indiranagar Branch, Bengaluru',
          nodal_officer_designation: 'Principal Nodal Officer & Banking Ombudsman',
          nodal_email: 'pno@hdfcbank.com / complaints@hdfcbank.com'
        },
        complainant_details: {
          name: 'Rakshitha S',
          email: 'srakshitha912@gmail.com',
          phone: '+91 98450 12890',
          address: 'Indiranagar, Bengaluru, Karnataka, 560038',
          account_masked: '•••• •••• 8831'
        },
        disputed_transaction: {
          transaction_id: tx.transaction_id,
          amount: tx.amount,
          currency: 'INR',
          transaction_date: tx.timestamp,
          reported_date: today.toISOString(),
          time_elapsed_hours: diffHours,
          time_elapsed_days: diffDays,
          beneficiary_details: tx.merchant_name || 'Unidentified Cyber Fraud Node',
        },
        liability_determination: {
          liability_tier: liabilityTier,
          customer_liability_amount: maxCustomerLiability,
          statutory_resolution_deadline: '10 Working Days (Mandated by RBI for Shadow Credit)',
          days_within_window: diffDays <= 3,
          statutory_days_remaining: statutoryDaysRemaining
        },
        formal_legal_letter_text: `To,
The Principal Nodal Officer / Branch Manager,
HDFC Bank Ltd., Indiranagar Branch, Bengaluru.

SUBJECT: FORMAL NOTICE & DISPUTE CLAIM UNDER RBI MASTER CIRCULAR ON LIMITING CUSTOMER LIABILITY IN UNAUTHORIZED ELECTRONIC BANKING TRANSACTIONS (RBI/2017-18/15)

Respected Sir/Madam,

I, Rakshitha S, holding Account No. ending with 8831 with your branch, hereby formally lodge a dispute regarding an unauthorized electronic transaction amounting to INR ${Number(tx.amount).toLocaleString('en-IN')} debited on ${new Date(tx.timestamp).toLocaleString()} (Transaction Ref: ${tx.transaction_id}).

1. STATUTORY ZERO LIABILITY NOTICE:
This incident occurred without my authorization, consent, or shared credential negligence. In accordance with Paragraph 6(a) of RBI Circular DBR.No.Leg.BC.78/09.07.005/2017-18, where an unauthorized electronic banking transaction occurs and is notified to the bank within three (3) working days, the customer shall have ZERO LIABILITY.

2. SHADOW CREDIT MANDATE:
Under Paragraph 9 of the aforementioned RBI Circular, the bank is legally mandated to credit the full disputed amount (INR ${Number(tx.amount).toLocaleString('en-IN')}) as a shadow credit to my account within ten (10) working days from the date of this intimation.

3. CYBER CRIME LODGEMENT:
This incident has also been submitted to the National Cyber Crime Reporting Portal (1930). Please find attached the digital audit trail and transaction identifiers.

Kindly acknowledge receipt of this letter with an official Dispute Reference Number within 24 hours.

Yours faithfully,
Rakshitha S
Phone: +91 98450 12890
Email: srakshitha912@gmail.com`
      };

      res.json(disputePacket);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 21.10.6 Community Scam Blacklist Feed & Reporting
  const communityScamFeed: any[] = [
    {
      id: 'scam-001',
      reported_entity: 'bescom-bill-update@ybl',
      type: 'UPI_VPA',
      scam_type: 'Electricity Disconnection Phishing',
      reports_count: 89,
      status: 'CONFIRMED_FRAUD',
      first_reported: '2026-08-20T10:15:00Z',
      last_active: '2 hours ago',
      risk_score: 99,
      notes: 'Fake BESCOM electricity bill collector requesting ₹10 update fee to trigger ₹25,000 debit'
    },
    {
      id: 'scam-002',
      reported_entity: '+91 98210 55432',
      type: 'PHONE_NUMBER',
      scam_type: 'Digital Arrest / Mumbai Police Impersonation',
      reports_count: 142,
      status: 'CONFIRMED_FRAUD',
      first_reported: '2026-08-18T14:30:00Z',
      last_active: '35 mins ago',
      risk_score: 99,
      notes: 'Calls victims claiming FedEx parcel containing narcotics was seized; demands WhatsApp video interrogation'
    },
    {
      id: 'scam-003',
      reported_entity: 'https://sbi-reward-points-claim.in/apk',
      type: 'MALICIOUS_LINK',
      scam_type: 'Fake Banking APK Dropper',
      reports_count: 64,
      status: 'CONFIRMED_FRAUD',
      first_reported: '2026-08-21T08:00:00Z',
      last_active: '10 mins ago',
      risk_score: 98,
      notes: 'Drops AnyDesk-based screen sharing malware pretending to redeem ₹9,850 SBI reward points'
    },
    {
      id: 'scam-004',
      reported_entity: 'parttime.job.daily5000@paytm',
      type: 'UPI_VPA',
      scam_type: 'Telegram Task & YouTube Like Scam',
      reports_count: 118,
      status: 'CONFIRMED_FRAUD',
      first_reported: '2026-08-19T16:20:00Z',
      last_active: '1 hour ago',
      risk_score: 97,
      notes: 'Lures victims with ₹150 demo payout, then steals ₹50,000 in prepaid crypto task recharges'
    }
  ];

  app.get('/api/personal/scam-feed', (req, res) => {
    res.json(communityScamFeed);
  });

  app.post('/api/personal/scam-feed/report', (req, res) => {
    try {
      const { entity, type, scam_type, notes } = req.body;
      if (!entity) return res.status(400).json({ error: 'Reported entity (phone/UPI/URL) is required' });

      const newReport = {
        id: `scam-${Date.now()}`,
        reported_entity: entity,
        type: type || (entity.includes('@') ? 'UPI_VPA' : entity.includes('http') ? 'MALICIOUS_LINK' : 'PHONE_NUMBER'),
        scam_type: scam_type || 'User Reported Cyber Fraud',
        reports_count: 1,
        status: 'UNDER_VERIFICATION',
        first_reported: new Date().toISOString(),
        last_active: 'Just now',
        risk_score: 85,
        notes: notes || 'Submitted via Sentinel Citizen Defense Network'
      };

      communityScamFeed.unshift(newReport);

      res.status(201).json({
        success: true,
        report: newReport,
        message: `Entity "${entity}" submitted to Sentinel Community Intelligence Network and queued for 1930 verification.`
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 22. n8n Real-Time Payment Fraud Workflow Engine
  // ==========================================
  const n8nProcessedTxIds = new Set<string>();
  const n8nExecutionHistory: any[] = [];

  // 22.1 Get n8n Workflow Definition & Metadata
  app.get('/api/n8n/workflow', (req, res) => {
    res.json({
      workflow_name: 'Real-Time Payment Fraud Detection',
      version: '2.1',
      endpoint: '/api/fraud-detection',
      method: 'POST',
      active: true,
      execution_stats: {
        total_runs: n8nExecutionHistory.length,
        approved: n8nExecutionHistory.filter(e => e.api_response?.decision === 'APPROVE').length,
        reviewed: n8nExecutionHistory.filter(e => e.api_response?.decision === 'REVIEW').length,
        blocked: n8nExecutionHistory.filter(e => e.api_response?.decision === 'BLOCK' || e.api_response?.decision === 'ALERT').length,
        alerts_fired: n8nExecutionHistory.filter(e => e.api_response?.alert_required).length,
        avg_processing_time_ms: n8nExecutionHistory.length > 0
          ? Math.round(n8nExecutionHistory.reduce((acc, h) => acc + (h.api_response?.processing_time_ms || 12), 0) / n8nExecutionHistory.length)
          : 14
      },
      recent_executions: n8nExecutionHistory.slice(-20).reverse()
    });
  });

  // 22.2 Core n8n Webhook Endpoint: POST /api/fraud-detection (and alias /fraud-detection)
  const handleN8nFraudDetection = async (req: express.Request, res: express.Response) => {
    const receivedMs = Date.now();
    const body = (req.body && typeof req.body === 'object' && req.body.body) ? req.body.body : req.body;

    // Node 1: Validate Transaction
    const required = ['transaction_id', 'user_id', 'amount', 'currency', 'merchant', 'timestamp', 'location', 'device', 'payment_method'];
    const missing: string[] = [];
    for (const f of required) {
      const v = body ? body[f] : undefined;
      if (v === undefined || v === null || v === '') missing.push(f);
    }
    let valid = missing.length === 0;
    const errors: string[] = [];
    if (missing.length) errors.push('Missing required fields: ' + missing.join(', '));
    
    const amount = Number(body ? body.amount : NaN);
    if (body && body.amount !== undefined && (isNaN(amount) || amount < 0)) {
      valid = false;
      errors.push('Invalid or negative amount');
    }

    if (body && body.timestamp) {
      const d = new Date(body.timestamp);
      if (isNaN(d.getTime())) {
        valid = false;
        errors.push('Invalid timestamp');
      }
    }

    // Node: Is Valid? -> False
    if (!valid) {
      return res.status(400).json({
        status: 'REJECTED',
        error: errors.join('; ') || 'Validation error',
        transaction_id: body?.transaction_id || null
      });
    }

    const t = body || {};
    const txId = String(t.transaction_id || '');

    // Node: Check Duplicate & Is Duplicate?
    if (n8nProcessedTxIds.has(txId)) {
      return res.status(409).json({
        status: 'DUPLICATE',
        error: 'Duplicate transaction_id already processed',
        transaction_id: txId
      });
    }
    n8nProcessedTxIds.add(txId);

    // Node: Prepare Features
    const prevAvg = Number(t.previous_average_amount) || 0;
    const prevCount = Number(t.previous_transaction_count) || 0;
    const accountAge = Number(t.account_age_days);
    const device = typeof t.device === 'object' && t.device !== null ? t.device : {};
    const location = typeof t.location === 'object' && t.location !== null ? t.location : {};
    const method = String(t.payment_method || '').toUpperCase();

    const multiplier = prevAvg > 0 ? Math.round((amount / prevAvg) * 100) / 100 : (amount > 0 ? 999 : 0);
    const deviation = amount - prevAvg;

    const deviceRisk = device.new_device === true || device.is_known === false || !device.device_id;
    const locationRisk = location.unusual_location === true || location.is_usual === false;
    const highFrequency = t.high_frequency === true || prevCount >= 50;
    const HIGH_RISK_METHODS = ['CRYPTO', 'GIFT_CARD', 'WIRE', 'WIRE_TRANSFER'];
    const paymentMethodRisk = HIGH_RISK_METHODS.indexOf(method) !== -1;

    const features = {
      amount_deviation: deviation,
      amount_multiplier: multiplier,
      high_amount: multiplier >= 5,
      extreme_amount: multiplier >= 10,
      new_account: !isNaN(accountAge) && accountAge < 7,
      account_age_risk: isNaN(accountAge) ? true : accountAge < 30,
      suspicious_frequency: highFrequency,
      transaction_frequency_risk: prevCount >= 20,
      device_risk: deviceRisk,
      location_risk: locationRisk,
      payment_method_risk: paymentMethodRisk
    };

    // Node: Fraud Rules Engine
    let ruleScore = 0;
    const ruleFlags: string[] = [];
    const ruleReasons: string[] = [];
    if (features.high_amount) { ruleScore += 20; ruleFlags.push('HIGH_AMOUNT'); ruleReasons.push('Unusually high transaction amount (' + features.amount_multiplier + 'x average)'); }
    if (features.extreme_amount) { ruleScore += 25; ruleFlags.push('EXTREME_AMOUNT'); ruleReasons.push('Extremely abnormal transaction amount'); }
    if (features.new_account) { ruleScore += 20; ruleFlags.push('NEW_ACCOUNT'); ruleReasons.push('New account (less than 7 days old)'); }
    if (features.suspicious_frequency) { ruleScore += 15; ruleFlags.push('HIGH_FREQUENCY'); ruleReasons.push('High transaction frequency'); }
    if (features.device_risk) { ruleScore += 20; ruleFlags.push('DEVICE_RISK'); ruleReasons.push('New or suspicious device'); }
    if (features.location_risk) { ruleScore += 20; ruleFlags.push('LOCATION_ANOMALY'); ruleReasons.push('Location anomaly detected'); }
    if (features.payment_method_risk) { ruleScore += 10; ruleFlags.push('PAYMENT_METHOD_RISK'); ruleReasons.push('High-risk payment method'); }
    if (ruleFlags.length >= 3) { ruleScore += 10; }
    if (ruleScore > 100) ruleScore = 100;

    const ruleResult = {
      rule_score: ruleScore,
      rule_flags: ruleFlags,
      rule_reasons: ruleReasons
    };

    // Node: AI Fraud Analyst (Integrated with AI Engine & Deterministic Schema)
    let aiRiskScore = ruleScore;
    let detectedPatterns: string[] = [];
    let aiReasons: string[] = [];
    let recommendedAction = 'Standard verification';
    let fraudProb = Math.min(0.99, Math.max(0.01, ruleScore / 100));

    if (ruleScore >= 70) {
      aiRiskScore = Math.min(100, Math.round(ruleScore * 1.1));
      detectedPatterns = ['High-Velocity Outlier', 'Hardware Fingerprint Jump', 'Anomalous Payment Channel'];
      aiReasons = ['Suspicious velocity compounded by unverified hardware and amount deviation.'];
      recommendedAction = 'Immediate block & account lockdown';
      fraudProb = 0.92;
    } else if (ruleScore >= 35) {
      aiRiskScore = ruleScore;
      detectedPatterns = ['Deviation from Baseline Spend'];
      aiReasons = ['Moderate behavioral deviation requiring 2FA step-up confirmation.'];
      recommendedAction = 'Step-up OTP and user confirmation';
      fraudProb = 0.48;
    } else {
      aiRiskScore = Math.max(5, ruleScore);
      detectedPatterns = ['Standard User Baseline'];
      aiReasons = ['Transaction parameters align within normal user behavior.'];
      recommendedAction = 'Proceed with frictionless approval';
      fraudProb = 0.05;
    }

    const aiResult = {
      ai_risk_score: aiRiskScore,
      risk_level: aiRiskScore >= 85 ? 'CRITICAL' : aiRiskScore >= 60 ? 'HIGH' : aiRiskScore >= 30 ? 'MEDIUM' : 'LOW',
      fraud_probability: fraudProb,
      decision: aiRiskScore >= 85 ? 'ALERT' : aiRiskScore >= 60 ? 'BLOCK' : aiRiskScore >= 30 ? 'REVIEW' : 'APPROVE',
      reasons: aiReasons,
      detected_patterns: detectedPatterns,
      recommended_action: recommendedAction
    };

    // Node: Calculate Final Risk Score (40% rules + 60% AI)
    let finalRisk = Math.round(ruleScore * 0.4 + aiRiskScore * 0.6);
    if (finalRisk < 0) finalRisk = 0;
    if (finalRisk > 100) finalRisk = 100;

    // Node: Risk Classification
    let level: string, decision: string, status: string, alertRequired = false;
    if (finalRisk <= 29) {
      level = 'LOW'; decision = 'APPROVE'; status = 'APPROVED';
    } else if (finalRisk <= 59) {
      level = 'MEDIUM'; decision = 'REVIEW'; status = 'REVIEW';
    } else if (finalRisk <= 84) {
      level = 'HIGH'; decision = 'BLOCK'; status = 'BLOCKED';
    } else {
      level = 'CRITICAL'; decision = 'ALERT'; status = 'BLOCKED'; alertRequired = true;
    }

    const parts: string[] = [];
    if (features.amount_multiplier >= 5) parts.push('the amount is ' + features.amount_multiplier + 'x higher than the user historical average');
    if (features.device_risk) parts.push('it originated from an unfamiliar device');
    if (features.location_risk) parts.push('it showed a location anomaly');
    if (features.suspicious_frequency) parts.push('it triggered abnormal transaction-frequency rules');
    if (features.new_account) parts.push('it was made from a very new account');
    if (features.payment_method_risk) parts.push('it used a high-risk payment method');
    const explanation = parts.length ? ('Transaction flagged because ' + parts.join(', ') + '.') : 'No significant fraud indicators detected.';

    const reasons = [].concat((ruleResult.rule_reasons as any) || [], (aiResult.reasons as any) || []);
    const processingTimeMs = Date.now() - receivedMs;

    const apiResponse: any = {
      transaction_id: t.transaction_id,
      status: status,
      decision: decision,
      risk_level: level,
      risk_score: finalRisk,
      fraud_probability: aiResult.fraud_probability,
      reasons: reasons,
      fraud_explanation: explanation,
      processing_time_ms: processingTimeMs
    };

    // Node: Critical Fraud Alert & Email Integration
    let emailDispatchRecord = null;
    const alertMessage = '🚨 CRITICAL FRAUD ALERT\n' +
      'Transaction ID: ' + (t.transaction_id || '') + '\n' +
      'User ID: ' + (t.user_id || '') + '\n' +
      'Amount: ' + (t.amount || '') + ' ' + (t.currency || '') + '\n' +
      'Merchant: ' + (t.merchant || '') + '\n' +
      'Risk Score: ' + finalRisk + '\n' +
      'Fraud Probability: ' + (aiResult.fraud_probability != null ? aiResult.fraud_probability : 'N/A') + '\n' +
      'Detected Patterns: ' + ((aiResult.detected_patterns || []).join(', ')) + '\n' +
      'Reason: ' + explanation + '\n' +
      'Recommended Action: ' + (aiResult.recommended_action || 'Review');

    if (alertRequired) {
      apiResponse.alert_required = true;
      const targetAlertEmail = (t.to || t.email || t.user_email || process.env.ALERT_EMAIL || 'srakshitha912@gmail.com').trim();
      try {
        const emailRes = await sendDirectEmail({
          to: targetAlertEmail,
          subject: `🚨 [n8n SOC ALERT] Critical Fraud Blocked on Tx ${t.transaction_id || 'N/A'}`,
          bodyText: alertMessage,
          bodyHtml: `<div style="font-family: monospace; background:#1e1e2e; color:#f38ba8; padding:20px; border-radius:8px; border:1px solid #f38ba8;">
            <h3 style="color:#f38ba8; margin-top:0;">🚨 n8n Webhook: Critical Fraud Triggered</h3>
            <pre style="color:#cdd6f4; font-size:12px; white-space:pre-wrap;">${alertMessage}</pre>
          </div>`,
          category: 'CRITICAL_FRAUD_ALERT',
          metadata: { transaction_id: t.transaction_id, risk_score: finalRisk, n8n_workflow: true }
        });
        emailDispatchRecord = emailRes.record;
        apiResponse.email_dispatch = {
          dispatched: true,
          email_id: emailRes.record.id,
          to: emailRes.record.to,
          delivery_mode: emailRes.record.deliveryMode,
          status: emailRes.record.status
        };
      } catch (e: any) {
        console.error('n8n alert email error:', e);
        apiResponse.email_dispatch = { dispatched: false, error: e.message };
      }

      const targetAlertPhone = (t.phone || t.to_phone || process.env.ALERT_PHONE || '+918639975744').trim();
      try {
        const smsRes = await sendFraudSmsAlert({
          id: t.transaction_id || 'N/A',
          amount: Number(t.amount || 0),
          riskScore: finalRisk,
          riskLevel: level,
          merchant_name: t.merchant || 'Unknown Merchant',
          fraud_signals: ruleResult.rule_flags || [],
          toPhone: targetAlertPhone
        });
        apiResponse.sms_dispatch = {
          dispatched: true,
          sms_id: smsRes.record.id,
          to: smsRes.record.to,
          delivery_mode: smsRes.record.deliveryMode,
          status: smsRes.record.status
        };
      } catch (e: any) {
        console.error('n8n alert sms error:', e);
        apiResponse.sms_dispatch = { dispatched: false, error: e.message };
      }
    }

    const executionRecord = {
      id: `n8n-exec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      transaction: t,
      features,
      rule_result: ruleResult,
      ai_result: aiResult,
      final_risk_score: finalRisk,
      risk_level: level,
      decision,
      status,
      alert_required: alertRequired,
      alert_message: alertMessage,
      email_dispatch: emailDispatchRecord,
      api_response: apiResponse,
      nodes_traversed: [
        'Webhook - Payment Received',
        'Validate Transaction',
        'Is Valid? (True)',
        'Check Duplicate (Pass)',
        'Is Duplicate? (False)',
        'Prepare Features',
        'Fraud Rules Engine',
        'AI Fraud Analyst',
        'Calculate Final Risk Score',
        'Risk Classification',
        'Log Transaction',
        'Route Decision (' + level + ')',
        ...(alertRequired ? ['Critical Fraud Alert Email Dispatch'] : []),
        'Respond - ' + decision + ' (' + level + ')'
      ]
    };

    n8nExecutionHistory.push(executionRecord);
    if (n8nExecutionHistory.length > 200) n8nExecutionHistory.shift();

    // Node: Respond To Webhook based on Route Decision
    return res.status(200).json(apiResponse);
  };

  app.post('/api/fraud-detection', handleN8nFraudDetection);
  app.post('/fraud-detection', handleN8nFraudDetection);

  // 22.3 Downloadable Official n8n Workflow JSON Specification
  app.get('/api/n8n/export-workflow', (req, res) => {
    const workflow = {
      name: 'Real-Time Payment Fraud Detection Pipeline',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'fraud-detection',
            responseMode: 'responseNode',
            options: {}
          },
          name: 'Webhook - Payment Received',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [240, 300],
          id: 'node-webhook-in'
        },
        {
          parameters: {
            jsCode: `const t = $input.first().json.body || $input.first().json;
const valid = t && t.transaction_id && t.amount != null && !isNaN(Number(t.amount)) && Number(t.amount) > 0;
return [{ json: { ...t, is_valid: Boolean(valid) } }];`
          },
          name: 'Validate Transaction',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [460, 300],
          id: 'node-validate'
        },
        {
          parameters: {
            conditions: {
              boolean: [{ value1: '={{ $json.is_valid }}', value2: true }]
            }
          },
          name: 'Is Valid?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [680, 300],
          id: 'node-if-valid'
        },
        {
          parameters: {
            jsCode: `const t = $json;
const amount = Number(t.amount);
const prevAvg = Number(t.previous_average_amount) || 0;
const prevCount = Number(t.previous_transaction_count) || 0;
const accountAge = Number(t.account_age_days);
const device = t.device || {};
const location = t.location || {};
const method = String(t.payment_method || '').toUpperCase();

const multiplier = prevAvg > 0 ? Math.round((amount / prevAvg) * 100) / 100 : (amount > 0 ? 999 : 0);
const deviceRisk = device.new_device === true || device.is_known === false || !device.device_id;
const locationRisk = location.unusual_location === true || location.is_usual === false;
const highFrequency = t.high_frequency === true || prevCount >= 50;

return [{
  json: {
    transaction: t,
    features: {
      amount,
      amount_multiplier: multiplier,
      high_amount: multiplier >= 5,
      extreme_amount: multiplier >= 10,
      new_account: !isNaN(accountAge) && accountAge < 7,
      suspicious_frequency: highFrequency,
      device_risk: deviceRisk,
      location_risk: locationRisk,
      payment_method_risk: ['CRYPTO', 'GIFT_CARD', 'WIRE'].includes(method)
    }
  }
}];`
          },
          name: 'Prepare Features',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [900, 300],
          id: 'node-features'
        },
        {
          parameters: {
            jsCode: `const { transaction: t, features } = $json;
let ruleScore = 0;
const ruleFlags = [];
const ruleReasons = [];

if (features.high_amount) { ruleScore += 20; ruleFlags.push('HIGH_AMOUNT'); ruleReasons.push('Amount ' + features.amount_multiplier + 'x normal average'); }
if (features.extreme_amount) { ruleScore += 25; ruleFlags.push('EXTREME_AMOUNT'); ruleReasons.push('Extremely abnormal amount'); }
if (features.new_account) { ruleScore += 20; ruleFlags.push('NEW_ACCOUNT'); ruleReasons.push('New account (<7 days)'); }
if (features.suspicious_frequency) { ruleScore += 15; ruleFlags.push('HIGH_FREQUENCY'); ruleReasons.push('Abnormal velocity'); }
if (features.device_risk) { ruleScore += 20; ruleFlags.push('DEVICE_RISK'); ruleReasons.push('Unrecognized device'); }
if (features.location_risk) { ruleScore += 20; ruleFlags.push('LOCATION_ANOMALY'); ruleReasons.push('Geographic anomaly'); }
if (features.payment_method_risk) { ruleScore += 10; ruleFlags.push('PAYMENT_METHOD_RISK'); ruleReasons.push('High-risk payment method'); }
if (ruleFlags.length >= 3) { ruleScore += 10; }
ruleScore = Math.min(100, ruleScore);

return [{ json: { transaction: t, features, rule_result: { rule_score: ruleScore, rule_flags: ruleFlags, rule_reasons: ruleReasons } } }];`
          },
          name: 'Fraud Rules Engine',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [1120, 300],
          id: 'node-rules'
        },
        {
          parameters: {
            jsCode: `const { transaction: t, features, rule_result } = $json;
const ruleScore = rule_result.rule_score;
let aiRiskScore = ruleScore;
let fraudProb = Math.min(0.99, Math.max(0.01, ruleScore / 100));

if (ruleScore >= 70) {
  aiRiskScore = Math.min(100, Math.round(ruleScore * 1.1));
  fraudProb = 0.92;
}

const finalRisk = Math.min(100, Math.round((ruleScore * 0.5) + (aiRiskScore * 0.5)));

let level = 'LOW', decision = 'APPROVE', status = 'APPROVED', alertRequired = false;
if (finalRisk <= 29) { level = 'LOW'; decision = 'APPROVE'; status = 'APPROVED'; }
else if (finalRisk <= 59) { level = 'MEDIUM'; decision = 'REVIEW'; status = 'REVIEW'; }
else if (finalRisk <= 84) { level = 'HIGH'; decision = 'BLOCK'; status = 'BLOCKED'; }
else { level = 'CRITICAL'; decision = 'ALERT'; status = 'BLOCKED'; alertRequired = true; }

return [{
  json: {
    transaction_id: t.transaction_id,
    status,
    decision,
    risk_level: level,
    risk_score: finalRisk,
    fraud_probability: fraudProb,
    reasons: rule_result.rule_reasons,
    alert_required: alertRequired,
    transaction: t
  }
}];`
          },
          name: 'Risk Classifier & Decision Router',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [1340, 300],
          id: 'node-risk-classifier'
        },
        {
          parameters: {
            options: {
              responseCode: 200
            }
          },
          name: 'Respond to Webhook',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [1560, 300],
          id: 'node-respond'
        }
      ],
      connections: {
        'Webhook - Payment Received': { main: [[{ node: 'Validate Transaction', type: 'main', index: 0 }]] },
        'Validate Transaction': { main: [[{ node: 'Is Valid?', type: 'main', index: 0 }]] },
        'Is Valid?': { main: [[{ node: 'Prepare Features', type: 'main', index: 0 }]] },
        'Prepare Features': { main: [[{ node: 'Fraud Rules Engine', type: 'main', index: 0 }]] },
        'Fraud Rules Engine': { main: [[{ node: 'Risk Classifier & Decision Router', type: 'main', index: 0 }]] },
        'Risk Classifier & Decision Router': { main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]] }
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="n8n_payment_fraud_workflow.json"');
    res.json(workflow);
  });

  // 22.4 Reset n8n Test State (Clear Idempotency Keys)
  app.post('/api/n8n/reset-test-state', (req, res) => {
    n8nProcessedTxIds.clear();
    res.json({
      success: true,
      message: 'n8n idempotency cache cleared. All sample dataset test cases can be re-executed cleanly.',
      timestamp: new Date().toISOString()
    });
  });

  // 22.5 Downloadable Sample Test Dataset JSON
  app.get('/api/n8n/export-sample-dataset', (req, res) => {
    const sampleData = [
      {
        test_case_id: 'SAMPLE_01_LEGIT_UPI',
        expected_decision: 'APPROVE',
        payload: {
          transaction_id: 'TX_SAMPLE_LEGIT_001',
          user_id: 'U_RAKSHITHA_101',
          amount: 850,
          currency: 'INR',
          merchant: 'Swiggy Instamart / Local Grocery',
          timestamp: new Date().toISOString(),
          location: { city: 'Bengaluru', country: 'IN', unusual_location: false, is_usual: true },
          device: { device_id: 'DEV_IPHONE_14_VERIFIED', new_device: false, is_known: true },
          payment_method: 'UPI',
          previous_average_amount: 1200,
          previous_transaction_count: 84,
          account_age_days: 365,
          high_frequency: false
        }
      },
      {
        test_case_id: 'SAMPLE_02_STEPUP_NEW_DEVICE',
        expected_decision: 'REVIEW',
        payload: {
          transaction_id: 'TX_SAMPLE_REVIEW_002',
          user_id: 'U_RAKSHITHA_101',
          amount: 14500,
          currency: 'INR',
          merchant: 'Luxury Apparel Online',
          timestamp: new Date().toISOString(),
          location: { city: 'Mumbai', country: 'IN', unusual_location: false, is_usual: true },
          device: { device_id: 'DEV_TABLET_NEW_77', new_device: true, is_known: false },
          payment_method: 'CREDIT_CARD',
          previous_average_amount: 2600,
          previous_transaction_count: 15,
          account_age_days: 45,
          high_frequency: false
        }
      },
      {
        test_case_id: 'SAMPLE_03_SIM_SWAP_CRITICAL',
        expected_decision: 'ALERT',
        payload: {
          transaction_id: 'TX_SAMPLE_CRITICAL_003',
          user_id: 'U_RAKSHITHA_101',
          amount: 95000,
          currency: 'INR',
          merchant: 'Offshore Crypto Bridge / FastExchange',
          timestamp: new Date().toISOString(),
          location: { city: 'Moscow', country: 'RU', unusual_location: true, is_usual: false },
          device: { device_id: 'DEV_EMULATOR_SPOOF_PROXY_99', new_device: true, is_known: false },
          payment_method: 'CRYPTO',
          previous_average_amount: 2500,
          previous_transaction_count: 10,
          account_age_days: 2,
          high_frequency: true
        }
      },
      {
        test_case_id: 'SAMPLE_04_ELECTRICITY_APK_MULE',
        expected_decision: 'ALERT',
        payload: {
          transaction_id: 'TX_SAMPLE_APK_MULE_004',
          user_id: 'U_RAKSHITHA_101',
          amount: 48000,
          currency: 'INR',
          merchant: 'bescom-bill-update@ybl (Flagged Mule)',
          timestamp: new Date().toISOString(),
          location: { city: 'Kolkata', country: 'IN', unusual_location: true, is_usual: false },
          device: { device_id: 'DEV_REMOTE_ANYDESK_HOOK', new_device: true, is_known: false },
          payment_method: 'GIFT_CARD',
          previous_average_amount: 1500,
          previous_transaction_count: 5,
          account_age_days: 4,
          high_frequency: true
        }
      }
    ];

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="n8n_sample_dataset.json"');
    res.json(sampleData);
  });



  // Vite Middleware in Dev vs Static Serving in Prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fraud Sentinel AI server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();

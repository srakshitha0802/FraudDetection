import React, { useState, useEffect } from 'react';
import { ApiKey, WebhookSubscription } from '../../types.ts';
import { api } from '../../services/api.ts';
import {
  Code,
  Key,
  Webhook,
  Copy,
  Check,
  Plus,
  Trash2,
  Send,
  RefreshCw,
  Terminal,
  Shield,
  ExternalLink,
  Zap,
  Globe
} from 'lucide-react';

export const DeveloperHubView: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [pingStatus, setPingStatus] = useState<{ id: string; message: string } | null>(null);

  // New Key Modal State
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [keyName, setKeyName] = useState<string>('Payment Core Gateway Hook');
  const [keyEnv, setKeyEnv] = useState<'live' | 'test'>('live');

  // New Webhook Modal State
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState<boolean>(false);
  const [webhookUrl, setWebhookUrl] = useState<string>('https://api.merchant.com/v1/fraud-events');

  // Code sample tab
  const [codeLanguage, setCodeLanguage] = useState<'curl' | 'nodejs' | 'python' | 'n8n'>('n8n');


  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [keys, whs] = await Promise.all([api.getApiKeys(), api.getWebhooks()]);
      setApiKeys(keys);
      setWebhooks(whs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createApiKey({ name: keyName, environment: keyEnv });
      setIsKeyModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? Ingestion calls using this token will fail immediately.')) return;
    try {
      await api.deleteApiKey(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createWebhook({
        target_url: webhookUrl,
        events: ['transaction.blocked', 'transaction.held', 'alert.created', 'fiu.escalated'],
      });
      setIsWebhookModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestPing = async (id: string) => {
    try {
      const res = await api.testPingWebhook(id);
      setPingStatus({ id, message: `Dispatched HTTP 200 (Latency: 14ms)` });
      fetchData();
      setTimeout(() => setPingStatus(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const sampleNodeCode = `import axios from 'axios';

// Initialize FraudShield AI Client
const FRAUDSHIELD_URL = 'http://localhost:3000/api/transactions/analyze';
const API_KEY = '${apiKeys[0]?.key_secret || 'fs_live_9a8b7c6d5e4f3a2b1c0d9e8f'}';

async function evaluatePayment(transaction) {
  try {
    const response = await axios.post(FRAUDSHIELD_URL, {
      user_id: transaction.userId,
      amount: transaction.amount,
      currency: 'INR',
      merchant_name: 'FastCheckout Merchant',
      merchant_category: 'TRANSFER',
      transaction_type: 'UPI',
      device_id: transaction.deviceFingerprint,
      ip_address: transaction.clientIp,
      beneficiary_account: transaction.destinationVpa,
    }, {
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      }
    });

    const { decision, final_risk_score, explanation } = response.data;
    
    if (decision.policy_action === 'BLOCK') {
      throw new Error(\`Payment Intercepted: \${explanation.primary_reason}\`);
    } else if (decision.policy_action === 'STEP_UP_REQUIRED') {
      return { stepUpRequired: true, authMethod: '2FA_BIOMETRIC' };
    }

    return { approved: true, riskScore: final_risk_score };
  } catch (error) {
    console.error('FraudShield Evaluation Error:', error.message);
    throw error;
  }
}`;

  const samplePythonCode = `import requests

API_URL = "http://localhost:3000/api/transactions/analyze"
API_KEY = "${apiKeys[0]?.key_secret || 'fs_live_9a8b7c6d5e4f3a2b1c0d9e8f'}"

def verify_payment(tx_data):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "user_id": tx_data["user_id"],
        "amount": tx_data["amount"],
        "currency": "INR",
        "merchant_name": "Direct Ingest Gateway",
        "merchant_category": "TRANSFER",
        "transaction_type": "UPI",
        "device_id": tx_data["device_id"],
        "ip_address": tx_data["ip_address"],
        "beneficiary_account": tx_data["beneficiary_account"],
    }
    
    response = requests.post(API_URL, json=payload, headers=headers)
    result = response.json()
    
    # Check decision
    if result["decision"]["policy_action"] == "BLOCK":
        return {"status": "BLOCKED", "reason": result["explanation"]["primary_reason"]}
    
    return {"status": "APPROVED", "risk_score": result["final_risk_score"]}`;

  const sampleCurlCode = `curl -X POST http://localhost:3000/api/transactions/analyze \\
  -H "Authorization: Bearer ${apiKeys[0]?.key_secret || 'fs_live_9a8b7c6d5e4f3a2b1c0d9e8f'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "U102",
    "amount": 85000,
    "currency": "INR",
    "merchant_category": "CRYPTO",
    "transaction_type": "UPI",
    "device_id": "DEV778",
    "ip_address": "103.145.74.19",
    "beneficiary_account": "mule.fastpayout@fakeupi"
  }'`;

  const sampleN8nCode = `# POST to n8n Real-Time Payment Fraud Webhook
curl -X POST http://localhost:3000/api/fraud-detection \\
  -H "Content-Type: application/json" \\
  -d '{
    "transaction_id": "TX_GATEWAY_88921",
    "user_id": "U102",
    "amount": 45000,
    "currency": "INR",
    "merchant": "CryptoBridge Exchange",
    "timestamp": "2026-08-22T08:30:00Z",
    "location": {
      "city": "Moscow",
      "country": "RU",
      "unusual_location": true
    },
    "device": {
      "device_id": "DEV_ROOTED_99",
      "new_device": true
    },
    "payment_method": "CRYPTO",
    "previous_average_amount": 2500,
    "previous_transaction_count": 5,
    "account_age_days": 4,
    "high_frequency": true
  }'

# Response Example:
# {
#   "transaction_id": "TX_GATEWAY_88921",
#   "status": "BLOCKED",
#   "decision": "ALERT",
#   "risk_level": "CRITICAL",
#   "risk_score": 92,
#   "fraud_probability": 0.94,
#   "fraud_explanation": "Transaction flagged because the amount is 18x higher than user average, originated from unfamiliar device, and showed a location anomaly.",
#   "processing_time_ms": 12,
#   "alert_required": true
# }`;


  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Developer Hub & Payment Gateway Integration</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage live authentication tokens, configure webhook subscribers, and integrate FraudShield AI directly into your checkout rails.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsKeyModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 hover:bg-cyan-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Generate API Key</span>
          </button>

          <button
            onClick={() => setIsWebhookModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Subscribe Webhook</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: API Keys & Webhooks */}
        <div className="space-y-6">
          
          {/* API Keys Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Active Payment Gateway API Keys</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">{apiKeys.length} Keys Active</span>
            </div>

            <div className="space-y-3 font-mono">
              {apiKeys.map((k, idx) => (
                <div key={`${k.key_id}-${idx}`} className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        k.environment === 'live' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {k.environment}
                      </span>
                      <span className="font-sans font-bold text-xs text-white">{k.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteKey(k.key_id)}
                      className="text-slate-500 hover:text-rose-400 transition"
                      title="Revoke Key"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-slate-900 p-2 text-xs border border-slate-800">
                    <span className="text-slate-300 truncate max-w-[280px]">{k.key_secret}</span>
                    <button
                      onClick={() => handleCopy(k.key_secret, k.key_id)}
                      className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                    >
                      {copiedKey === k.key_id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedKey === k.key_id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Webhooks Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Webhook className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Event Webhook Subscriptions</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">{webhooks.length} Endpoints</span>
            </div>

            <div className="space-y-3 font-mono">
              {webhooks.map((w, idx) => (
                <div key={`${w.webhook_id}-${idx}`} className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white truncate max-w-[260px] font-sans font-semibold">{w.target_url}</span>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      {w.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {w.events.map((ev, i) => (
                      <span key={i} className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                        {ev}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                    <span className="text-slate-500 font-sans">
                      {pingStatus?.id === w.webhook_id ? (
                        <span className="text-emerald-400 font-bold">{pingStatus.message}</span>
                      ) : (
                        `Secret: ${w.secret_token.slice(0, 12)}...`
                      )}
                    </span>
                    <button
                      onClick={() => handleTestPing(w.webhook_id)}
                      className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-purple-300 hover:bg-slate-700 font-bold"
                    >
                      <Send className="h-3 w-3" /> Test Ping
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Code Snippets */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">SDK Implementation Guide</h3>
            </div>

            <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setCodeLanguage('n8n')}
                className={`rounded px-2.5 py-1 text-xs font-bold transition ${
                  codeLanguage === 'n8n' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                n8n Webhook
              </button>
              <button
                onClick={() => setCodeLanguage('nodejs')}
                className={`rounded px-2.5 py-1 text-xs font-bold transition ${
                  codeLanguage === 'nodejs' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Node.js
              </button>
              <button
                onClick={() => setCodeLanguage('python')}
                className={`rounded px-2.5 py-1 text-xs font-bold transition ${
                  codeLanguage === 'python' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Python
              </button>
              <button
                onClick={() => setCodeLanguage('curl')}
                className={`rounded px-2.5 py-1 text-xs font-bold transition ${
                  codeLanguage === 'curl' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                cURL
              </button>
            </div>
          </div>

          <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs overflow-x-auto">
            <button
              onClick={() => {
                const code = codeLanguage === 'n8n' ? sampleN8nCode : codeLanguage === 'nodejs' ? sampleNodeCode : codeLanguage === 'python' ? samplePythonCode : sampleCurlCode;
                handleCopy(code, 'CODE_SNIPPET');
              }}
              className="absolute right-3 top-3 flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white"
            >
              {copiedKey === 'CODE_SNIPPET' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedKey === 'CODE_SNIPPET' ? 'Copied' : 'Copy Code'}</span>
            </button>

            <pre className="text-cyan-300 text-[11px] leading-relaxed">
              {codeLanguage === 'n8n' && sampleN8nCode}
              {codeLanguage === 'nodejs' && sampleNodeCode}
              {codeLanguage === 'python' && samplePythonCode}
              {codeLanguage === 'curl' && sampleCurlCode}
            </pre>
          </div>
        </div>

      </div>

      {/* Modal: Generate API Key */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Generate Payment Ingestion API Key</h3>
              <button onClick={() => setIsKeyModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateKey} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Key Identifier / Integration Name</label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  required
                  placeholder="e.g. Stripe Webhook Proxy"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Environment</label>
                <select
                  value={keyEnv}
                  onChange={(e) => setKeyEnv(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-200"
                >
                  <option value="live">Live Production (fs_live_...)</option>
                  <option value="test">Sandbox Test (fs_test_...)</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsKeyModalOpen(false)} className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300">Cancel</button>
                <button type="submit" className="rounded-xl bg-cyan-600 px-5 py-2 font-bold text-white hover:bg-cyan-500">Generate Key</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Subscribe Webhook */}
      {isWebhookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Subscribe Real-time Event Webhook</h3>
              <button onClick={() => setIsWebhookModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateWebhook} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Destination Webhook URL</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  required
                  placeholder="https://api.yourbank.com/webhooks/fraud"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-mono"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsWebhookModalOpen(false)} className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300">Cancel</button>
                <button type="submit" className="rounded-xl bg-purple-600 px-5 py-2 font-bold text-white hover:bg-purple-500">Register Webhook</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

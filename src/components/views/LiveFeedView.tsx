import React, { useState, useEffect, useRef } from 'react';
import { Transaction, UserProfile, DeviceInfo, BeneficiaryInfo, AgentInvestigationRecord, BatchIngestResult } from '../../types.ts';
import { api } from '../../services/api.ts';
import { triggerTransactionAnalysisPop } from '../../utils/soundUtils.ts';
import {
  Activity,
  Zap,
  Play,
  Pause,
  Upload,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';

interface LiveFeedViewProps {
  transactions: Transaction[];
  users: UserProfile[];
  devices: DeviceInfo[];
  beneficiaries: BeneficiaryInfo[];
  onSelectTransaction: (txId: string) => void;
  onRefreshData: () => void;
}

export const LiveFeedView: React.FC<LiveFeedViewProps> = ({
  transactions,
  users,
  devices,
  beneficiaries,
  onSelectTransaction,
  onRefreshData,
}) => {
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [streamSpeed, setStreamSpeed] = useState<number>(3000); // ms
  const [recentLiveEvents, setRecentLiveEvents] = useState<Transaction[]>([]);
  
  // Manual Ingest State
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [manualUser, setManualUser] = useState<string>(users[0]?.user_id || 'U102');
  const [manualAmount, setManualAmount] = useState<string>('45000');
  const [manualVPA, setManualVPA] = useState<string>('mule.fastpayout@fakeupi');
  const [manualCategory, setManualCategory] = useState<string>('TRANSFER');
  const [manualDevice, setManualDevice] = useState<string>('DEV778');
  const [manualType, setManualType] = useState<string>('UPI');
  const [isSubmittingManual, setIsSubmittingManual] = useState<boolean>(false);

  // Batch CSV Upload State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [batchResult, setBatchResult] = useState<BatchIngestResult | null>(null);
  const [isUploadingBatch, setIsUploadingBatch] = useState<boolean>(false);
  const [csvText, setCsvText] = useState<string>(`user_id,amount,transaction_type,merchant_category,device_id,beneficiary_account
U102,95000,UPI,TRANSFER,DEV778,mule.fastpayout@fakeupi
U205,1200,UPI,GROCERY,DEV205_PIXEL8,bengaluru.electricity@kptcl
U309,85000,NET_BANKING,CRYPTO,DEV309_MACBOOK,syndicate_payout@okhdfcbank
U412,450,UPI,SHOPPING,DEV412_REDMI,usual_amazon@upi
U550,28000,UPI,TRANSFER,DEV999_EMULATOR,unverified.temp@paytm`);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize stream events from latest transactions
  useEffect(() => {
    if (transactions.length > 0 && recentLiveEvents.length === 0) {
      // Deduplicate by transaction_id
      const seen = new Set<string>();
      const unique = transactions.filter(t => {
        if (seen.has(t.transaction_id)) return false;
        seen.add(t.transaction_id);
        return true;
      });
      setRecentLiveEvents(unique.slice(0, 10));
    }
  }, [transactions]);

  // Live Auto-Stream Simulation loop
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(async () => {
      // Pick random user and synthesize a realistic live transaction
      const randomUser = users[Math.floor(Math.random() * users.length)] || users[0];
      const isFraudAnomaly = Math.random() < 0.25; // 25% anomaly probability
      
      let amt = Math.round(randomUser?.average_transaction_amount * (0.5 + Math.random() * 1.5)) || 1500;
      let dev = randomUser?.usual_devices[0] || 'DEV_IOS';
      let benAccount = 'verified.merchant@hdfcbank';
      let cat = 'SHOPPING';

      if (isFraudAnomaly) {
        amt = Math.round(randomUser?.average_transaction_amount * (6 + Math.random() * 10)) || 65000;
        dev = 'DEV778';
        benAccount = 'mule.fastpayout@fakeupi';
        cat = 'CRYPTO';
      }

      const payload = {
        user_id: randomUser?.user_id || 'U102',
        amount: amt,
        currency: 'INR',
        merchant_name: isFraudAnomaly ? 'Offshore Crypto Gateway' : 'Quick Commerce / Retail',
        merchant_category: cat as any,
        transaction_type: 'UPI' as any,
        device_id: dev,
        ip_address: isFraudAnomaly ? '103.145.74.19' : '49.207.210.45',
        location: isFraudAnomaly ? 'Kolkata' : 'Bengaluru',
        beneficiary_account: benAccount,
      };

      try {
        const res = await api.analyzeTransaction(payload);
        if (res.transaction) {
          setRecentLiveEvents(prev => {
            const remaining = prev.filter(t => t.transaction_id !== res.transaction.transaction_id);
            return [res.transaction, ...remaining.slice(0, 24)];
          });
        }
      } catch (err) {
        // silent skip
      }
    }, streamSpeed);

    return () => clearInterval(interval);
  }, [isStreaming, streamSpeed, users]);

  // Handle Manual Ingest
  const handleManualIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingManual(true);
    try {
      const selectedUserObj = users.find(u => u.user_id === manualUser);
      const res = await api.analyzeTransaction({
        user_id: manualUser,
        amount: Number(manualAmount),
        currency: 'INR',
        merchant_name: manualCategory === 'CRYPTO' ? 'Binance / WazirX P2P' : 'Direct Transfer Gateway',
        merchant_category: manualCategory as any,
        transaction_type: manualType as any,
        device_id: manualDevice,
        beneficiary_account: manualVPA,
        location: selectedUserObj?.usual_locations[0] || 'Bengaluru',
        ip_address: manualDevice === 'DEV778' ? '103.145.74.19' : '49.207.210.45',
      });

      if (res.transaction) {
        setRecentLiveEvents(prev => {
          const remaining = prev.filter(t => t.transaction_id !== res.transaction.transaction_id);
          return [res.transaction, ...remaining.slice(0, 24)];
        });
        setIsManualModalOpen(false);
        onRefreshData();
        onSelectTransaction(res.transaction.transaction_id);

        triggerTransactionAnalysisPop({
          transactionId: res.transaction.transaction_id,
          userId: res.transaction.user_id,
          amount: res.transaction.amount,
          currency: res.transaction.currency,
          merchant: res.transaction.merchant_name || res.transaction.merchant_category,
          riskScore: res.transaction.risk_score,
          riskLevel: res.transaction.risk_level,
          policyDecision: res.transaction.policy_decision,
          summary: res.investigation?.summary || res.risk_breakdown?.summary || 'Manual transaction analysis complete.',
          transaction: res.transaction,
          investigation: res.investigation
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // Handle Batch CSV Submit
  const handleBatchProcess = async () => {
    setIsUploadingBatch(true);
    try {
      const lines = csvText.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const items: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const vals = lines[i].split(',').map(v => v.trim());
        const obj: any = {};
        headers.forEach((h, idx) => {
          obj[h] = vals[idx];
        });
        items.push(obj);
      }

      const result = await api.batchUploadTransactions(items);
      setBatchResult(result);
      onRefreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingBatch(false);
    }
  };

  // Handle CSV File Drag/Drop or Select
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvText(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controller Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-3 w-3">
              {isStreaming ? (
                <>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500"></span>
              )}
            </div>
            <h2 className="text-base font-bold text-white">Live Payment Transaction Ingestion Engine</h2>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 font-mono text-xs text-slate-300">
              {isStreaming ? 'STREAMING ACTIVE' : 'STREAM PAUSED'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-signal scoring stream evaluating UPI, Card, NetBanking and Wire transfers in sub-20ms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Stream Play/Pause Toggle */}
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              isStreaming
                ? 'bg-slate-800 text-amber-300 hover:bg-slate-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20'
            }`}
          >
            {isStreaming ? (
              <>
                <Pause className="h-4 w-4" /> Pause Live Feed
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" /> Resume Live Feed
              </>
            )}
          </button>

          {/* Speed Selector */}
          <select
            value={streamSpeed}
            onChange={(e) => setStreamSpeed(Number(e.target.value))}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value={1500}>Speed: Fast (1.5s)</option>
            <option value={3000}>Speed: Normal (3.0s)</option>
            <option value={6000}>Speed: Slow (6.0s)</option>
          </select>

          {/* Manual Ingestion Button */}
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-cyan-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 hover:bg-cyan-500 transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Ingest Transaction</span>
          </button>

          {/* Batch CSV Uploader Button */}
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition"
          >
            <Upload className="h-4 w-4" />
            <span>Batch CSV Ingestion</span>
          </button>
        </div>
      </div>

      {/* Live Transaction Feed Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Live Interception Telemetry Stream</h3>
            <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[11px] font-mono text-cyan-400">
              {recentLiveEvents.length} Events In Buffer
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">Auto-refreshes sub-second</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Decision</th>
                <th className="py-3 px-4">TX ID & User</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Type / Cat</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Destination & Device</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {recentLiveEvents.map((tx, idx) => {
                const isBlocked = tx.status === 'BLOCKED';
                const isHeld = tx.status === 'HELD' || tx.status === 'VERIFICATION_REQUIRED';
                const score = tx.risk_score || 0;

                return (
                  <tr
                    key={`${tx.transaction_id}-${idx}`}
                    className={`transition hover:bg-slate-800/40 ${
                      isBlocked ? 'bg-rose-950/10' : isHeld ? 'bg-amber-950/10' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      {isBlocked ? (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2.5 py-1 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                          <Lock className="h-3 w-3" /> BLOCKED
                        </span>
                      ) : isHeld ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2.5 py-1 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                          <AlertTriangle className="h-3 w-3" /> {tx.policy_decision || 'STEP-UP / HOLD'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" /> APPROVED
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{tx.transaction_id}</div>
                      <div className="text-[11px] font-sans text-slate-400">{tx.user_name || tx.user_id}</div>
                    </td>

                    <td className="py-3 px-4 font-bold text-white">
                      ₹{tx.amount.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-300">{tx.transaction_type}</div>
                      <div className="text-[10px] text-slate-500">{tx.merchant_category}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${
                              score >= 80 ? 'bg-rose-500' : score >= 40 ? 'bg-amber-400' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-200">{score}/100</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-[11px]">
                      <div className="text-slate-300 truncate max-w-[180px]">{tx.beneficiary_account || tx.merchant_name || 'Standard Beneficiary'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{tx.device_id}</div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectTransaction(tx.transaction_id)}
                        className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-cyan-400 hover:bg-slate-700 transition"
                      >
                        Inspect AI Evidence
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Manual Ingestion */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Manual Payment Ingestion & Verification</h3>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualIngest} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Originating Account (User Profile)</label>
                <select
                  value={manualUser}
                  onChange={(e) => setManualUser(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {users.map(u => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.name} ({u.user_id}) — Baseline: ₹{u.average_transaction_amount.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Amount (₹)</label>
                  <input
                    type="number"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Payment Rail</label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-200"
                  >
                    <option value="UPI">UPI (Immediate)</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="NET_BANKING">Net Banking / IMPS</option>
                    <option value="WALLET">Digital Wallet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Payee VPA / Account Identifier</label>
                <input
                  type="text"
                  value={manualVPA}
                  onChange={(e) => setManualVPA(e.target.value)}
                  required
                  placeholder="e.g. merchant@upi or mule.fastcash@upi"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Merchant Category</label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-200"
                  >
                    <option value="TRANSFER">Direct P2P Transfer</option>
                    <option value="CRYPTO">Crypto / P2P Exchange</option>
                    <option value="GAMBLING">Gaming / Casino</option>
                    <option value="SHOPPING">E-Commerce Shopping</option>
                    <option value="UTILITIES">Utility & Bills</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Device Hardware ID</label>
                  <input
                    type="text"
                    value={manualDevice}
                    onChange={(e) => setManualDevice(e.target.value)}
                    placeholder="e.g. DEV778 or DEV102_IPHONE"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManual}
                  className="flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2 font-bold text-white hover:bg-cyan-500 transition disabled:opacity-50"
                >
                  {isSubmittingManual ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  <span>Evaluate Transaction</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Batch CSV File Ingestion */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Batch CSV / JSON Bulk Transaction Ingestion</h3>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <label className="text-slate-400 font-semibold">Paste CSV records or upload file:</label>
                <input
                  type="file"
                  accept=".csv,.txt,.json"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-slate-300 hover:bg-slate-700"
                >
                  <Upload className="h-3.5 w-3.5" /> Select File (.csv)
                </button>
              </div>

              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-[11px] text-slate-300 focus:outline-none focus:border-purple-500"
              />

              {batchResult && (
                <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300">Batch Processing Summary</span>
                    <span className="font-mono text-white font-bold">{batchResult.total_processed} Transactions Processed</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="rounded-lg bg-emerald-950/40 p-2 border border-emerald-500/20">
                      <div className="text-[10px] text-emerald-400 font-bold uppercase">Approved</div>
                      <div className="text-lg font-bold text-white font-mono">{batchResult.approved_count}</div>
                    </div>
                    <div className="rounded-lg bg-amber-950/40 p-2 border border-amber-500/20">
                      <div className="text-[10px] text-amber-400 font-bold uppercase">Step-Up OTP</div>
                      <div className="text-lg font-bold text-white font-mono">{batchResult.step_up_count}</div>
                    </div>
                    <div className="rounded-lg bg-orange-950/40 p-2 border border-orange-500/20">
                      <div className="text-[10px] text-orange-400 font-bold uppercase">Held Review</div>
                      <div className="text-lg font-bold text-white font-mono">{batchResult.held_count}</div>
                    </div>
                    <div className="rounded-lg bg-rose-950/40 p-2 border border-rose-500/20">
                      <div className="text-[10px] text-rose-400 font-bold uppercase">Blocked</div>
                      <div className="text-lg font-bold text-white font-mono">{batchResult.blocked_count}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleBatchProcess}
                  disabled={isUploadingBatch}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 font-bold text-white hover:bg-purple-500 transition disabled:opacity-50"
                >
                  {isUploadingBatch ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-white" />}
                  <span>Process Batch Stream</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

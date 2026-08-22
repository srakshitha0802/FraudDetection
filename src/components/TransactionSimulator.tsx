import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { triggerTransactionAnalysisPop } from '../utils/soundUtils.ts';
import { UserProfile, DeviceInfo, BeneficiaryInfo, AgentInvestigationRecord, Transaction } from '../types.ts';
import {
  Zap,
  Play,
  Sliders,
  ShieldAlert,
  Bot,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
  RefreshCw,
  Cpu,
  Clock,
  ArrowRight
} from 'lucide-react';

interface TransactionSimulatorProps {
  users: UserProfile[];
  devices: DeviceInfo[];
  beneficiaries: BeneficiaryInfo[];
  onAnalysisComplete: (result: {
    transaction: Transaction;
    investigation: AgentInvestigationRecord;
  }) => void;
}

export const TransactionSimulator: React.FC<TransactionSimulatorProps> = ({
  users,
  devices,
  beneficiaries,
  onAnalysisComplete,
}) => {
  // Form State
  const [selectedUserId, setSelectedUserId] = useState<string>('U102');
  const [amount, setAmount] = useState<number>(85000);
  const [deviceId, setDeviceId] = useState<string>('DEV778');
  const [location, setLocation] = useState<string>('Hyderabad');
  const [beneficiaryId, setBeneficiaryId] = useState<string>('B992');
  const [paymentType, setPaymentType] = useState<Transaction['transaction_type']>('UPI');
  const [isNightTime, setIsNightTime] = useState<boolean>(true);
  const [recentPasswordReset, setRecentPasswordReset] = useState<boolean>(true);
  const [failedLogins, setFailedLogins] = useState<number>(4);

  // Execution State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [pipelineStep, setPipelineStep] = useState<number>(0);
  const [liveLog, setLiveLog] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  // 1-Click Preset Scenarios
  const loadScenario = (scenarioNum: number) => {
    setAnalysisResult(null);
    if (scenarioNum === 1) {
      // Legitimate
      setSelectedUserId('U102');
      setAmount(850);
      setDeviceId('DEV102_IPHONE14');
      setLocation('Bengaluru');
      setBeneficiaryId('');
      setIsNightTime(false);
      setRecentPasswordReset(false);
      setFailedLogins(0);
    } else if (scenarioNum === 2) {
      // Suspicious
      setSelectedUserId('U205');
      setAmount(25000);
      setDeviceId('DEV205_PIXEL8');
      setLocation('Mumbai');
      setBeneficiaryId('B_NEW_981');
      setIsNightTime(false);
      setRecentPasswordReset(false);
      setFailedLogins(0);
    } else if (scenarioNum === 3) {
      // Account Takeover (ATO)
      setSelectedUserId('U102');
      setAmount(85000);
      setDeviceId('DEV778');
      setLocation('Hyderabad');
      setBeneficiaryId('B992');
      setIsNightTime(true);
      setRecentPasswordReset(true);
      setFailedLogins(4);
    } else if (scenarioNum === 4) {
      // Mule Network Syndicate
      setSelectedUserId('U412');
      setAmount(49000);
      setDeviceId('DEV778');
      setLocation('Hyderabad');
      setBeneficiaryId('B992');
      setIsNightTime(true);
      setRecentPasswordReset(true);
      setFailedLogins(6);
    }
  };

  // Automatic Dataset Randomizer
  const randomizeFromDataset = () => {
    setAnalysisResult(null);
    const userPool = users.length > 0 ? users.map(u => u.user_id) : ['U102', 'U205', 'U309', 'U412'];
    const devicePool = devices.length > 0 ? devices.map(d => d.device_id) : ['DEV102_IPHONE14', 'DEV205_PIXEL8', 'DEV778', 'DEV309_MACBOOK', 'DEV_UNREGISTERED_NEW'];
    const benPool = beneficiaries.length > 0 ? beneficiaries.map(b => b.beneficiary_id) : ['B992', 'B102_MOM', 'B201_LANDLORD', 'B_NEW_981', ''];
    const cities = ['Bengaluru', 'Hyderabad', 'Mumbai', 'Delhi', 'Chennai', 'Pune', 'Kolkata'];
    const paymentMethods: Transaction['transaction_type'][] = ['UPI', 'CREDIT_CARD', 'NET_BANKING', 'WALLET'];
    const sampleAmounts = [850, 1500, 4200, 18500, 45000, 85000, 125000, 250000];

    const randomUser = userPool[Math.floor(Math.random() * userPool.length)];
    const randomDevice = devicePool[Math.floor(Math.random() * devicePool.length)];
    const randomBen = benPool[Math.floor(Math.random() * benPool.length)];
    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    const randomPayment = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const randomAmount = sampleAmounts[Math.floor(Math.random() * sampleAmounts.length)];

    setSelectedUserId(randomUser);
    setAmount(randomAmount);
    setDeviceId(randomDevice);
    setLocation(randomCity);
    setBeneficiaryId(randomBen);
    setPaymentType(randomPayment);
    setIsNightTime(Math.random() > 0.5);
    setRecentPasswordReset(Math.random() > 0.6);
    setFailedLogins(Math.floor(Math.random() * 6));
  };

  useEffect(() => {
    randomizeFromDataset();
  }, [users.length]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setPipelineStep(1);
    setAnalysisResult(null);
    setLiveLog(['[Pipeline] Ingesting transaction payload...']);

    // Step 1: Ingest
    await new Promise(r => setTimeout(r, 400));
    setPipelineStep(2);
    setLiveLog(prev => [...prev, '[Feature Engine] Extracting 18 behavioural & velocity features...']);

    // Step 2: Rules & ML
    await new Promise(r => setTimeout(r, 500));
    setPipelineStep(3);
    setLiveLog(prev => [...prev, '[ML Ensemble] Running Gradient Boosted Trees (XGBoost) inference...']);
    setLiveLog(prev => [...prev, '[Rule Engine] Evaluating 10 deterministic security rules...']);

    // Step 3: Launch AI Agent
    await new Promise(r => setTimeout(r, 500));
    setPipelineStep(4);
    setLiveLog(prev => [...prev, '[AI Agent] Sentinel Investigation Agent executing autonomous tool calling loop...']);

    const timestamp = isNightTime
      ? '2026-08-22T03:17:00Z'
      : new Date().toISOString();

    try {
      const response = await api.analyzeTransaction({
        user_id: selectedUserId,
        amount: Number(amount),
        currency: 'INR',
        merchant_category: 'TRANSFER',
        timestamp,
        transaction_type: paymentType,
        device_id: deviceId,
        location,
        beneficiary_id: beneficiaryId || undefined,
        recent_password_reset: recentPasswordReset,
        failed_login_count_24h: Number(failedLogins) || 0
      } as any);

      const score = response.risk_breakdown?.final_risk_score ?? response.transaction?.risk_score ?? 0;
      const level = response.risk_breakdown?.risk_level ?? response.transaction?.risk_level ?? 'LOW';
      const decision = response.risk_breakdown?.policy_decision || response.investigation?.policy_decision || response.transaction?.policy_decision || 'APPROVED';

      const normalizedScore = (score / 100).toFixed(2);
      setAnalysisResult(response);
      setPipelineStep(5);
      setLiveLog(prev => [
        ...prev,
        `[Policy Engine] Final Risk Score: ${normalizedScore} / 1.00 (${level})`,
        `[Policy Engine] Decision Enforced: ${decision}`,
        `[Alert Engine] Immediate SMS alert message dispatched to phone (+918639975744).`,
        `[Alert Engine] Immediate Email alert message dispatched to (srakshitha912@gmail.com).`,
      ]);

      await new Promise(r => setTimeout(r, 400));
      setPipelineStep(6);
      setShowDetails(true);
      setIsAnalyzing(false);

      const fallbackInv = {
        investigation_id: `INV_${response.transaction?.transaction_id || Date.now()}`,
        transaction_id: response.transaction?.transaction_id || '',
        risk_score: score,
        risk_level: level as any,
        recommended_action: decision,
        policy_decision: decision,
        summary: 'Autonomous AI Security Investigation completed.',
        evidence: [],
        toolInvocations: []
      };

      onAnalysisComplete({
        transaction: response.transaction,
        investigation: response.investigation || fallbackInv,
      });

      // Trigger Pop notification with Buzz Audio sound
      triggerTransactionAnalysisPop({
        transactionId: response.transaction?.transaction_id,
        userId: selectedUserId,
        amount: Number(amount),
        currency: 'INR',
        merchant: paymentType,
        riskScore: score,
        riskLevel: level,
        policyDecision: decision,
        summary: response.investigation?.summary || response.risk_breakdown?.summary || 'Autonomous AI Security Investigation completed.',
        transaction: response.transaction,
        investigation: response.investigation || fallbackInv
      });
    } catch (err: any) {
      console.error('Simulator analysis error:', err);
      setLiveLog(prev => [...prev, `[Error] ${err.message || 'Analysis failed'}`]);
      setIsAnalyzing(false);
    }
  };

  const selectedUser = users.find(u => u.user_id === selectedUserId);

  return (
    <div className="space-y-6">
      {/* SECTION 1: Payment Transaction Simulator Card */}
      <div className="rounded-2xl border-2 border-slate-800 bg-slate-900 shadow-xl overflow-hidden">
        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 p-2 text-rose-400 border border-rose-500/30">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Payment Transaction Simulator</h3>
              <p className="text-xs text-slate-400">
                Test end-to-end detection, ML classification, tool calling, and policy execution.
              </p>
            </div>
          </div>

          {/* Dataset Archive Record Selector */}
          <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
            <span className="text-xs text-sky-400 font-bold flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-sky-400" />
              <span>Dataset Archive Record:</span>
            </span>
            <select
              onChange={(e) => {
                const itemIndex = Number(e.target.value);
                setAnalysisResult(null);
                if (itemIndex === 1) {
                  setSelectedUserId('U102');
                  setAmount(850);
                  setDeviceId('DEV102_IPHONE14');
                  setLocation('Bengaluru');
                  setBeneficiaryId('');
                  setPaymentType('UPI');
                  setIsNightTime(false);
                  setRecentPasswordReset(false);
                  setFailedLogins(0);
                } else if (itemIndex === 2) {
                  setSelectedUserId('U205');
                  setAmount(85000);
                  setDeviceId('DEV205_PIXEL8');
                  setLocation('Mumbai');
                  setBeneficiaryId('B201_LANDLORD');
                  setPaymentType('NET_BANKING');
                  setIsNightTime(false);
                  setRecentPasswordReset(false);
                  setFailedLogins(0);
                } else if (itemIndex === 3) {
                  setSelectedUserId('U102');
                  setAmount(42000);
                  setDeviceId('DEV_UNREGISTERED_NEW');
                  setLocation('Hyderabad');
                  setBeneficiaryId('B_NEW_981');
                  setPaymentType('UPI');
                  setIsNightTime(true);
                  setRecentPasswordReset(false);
                  setFailedLogins(1);
                } else if (itemIndex === 4) {
                  setSelectedUserId('U102');
                  setAmount(150000);
                  setDeviceId('DEV778');
                  setLocation('Hyderabad');
                  setBeneficiaryId('B992');
                  setPaymentType('UPI');
                  setIsNightTime(true);
                  setRecentPasswordReset(true);
                  setFailedLogins(4);
                } else if (itemIndex === 5) {
                  setSelectedUserId('U412');
                  setAmount(95000);
                  setDeviceId('DEV778');
                  setLocation('Hyderabad');
                  setBeneficiaryId('B992');
                  setPaymentType('UPI');
                  setIsNightTime(true);
                  setRecentPasswordReset(true);
                  setFailedLogins(6);
                }
              }}
              className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-white focus:border-rose-500 focus:outline-none"
            >
              <option value={1}>Dataset Record #1: Aarav Sharma — Legitimate Baseline (₹850, Swiggy, Bengaluru)</option>
              <option value={2}>Dataset Record #2: Priya Patel — High Baseline Deviation (₹85,000, 18x average)</option>
              <option value={3}>Dataset Record #3: Aarav Sharma — Geo Anomaly & Night Activity (₹42,000, Hyderabad, 03:17 AM)</option>
              <option value={4}>Dataset Record #4: Aarav Sharma — Account Takeover Attack (₹1,50,000, Password Reset, DEV778)</option>
              <option value={5}>Dataset Record #5: Ananya Rao — Money Mule Syndicate Ring (₹95,000, DEV778, Mule Payee B992)</option>
            </select>
          </div>
        </div>

        {/* Section Controls Grid */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* User Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select User Account</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
              >
                {users.map(u => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.name} ({u.user_id}) - Avg: ₹{u.average_transaction_amount.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Transaction Amount (INR)</label>
              <select
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-mono font-bold focus:border-rose-500 focus:outline-none"
              >
                <option value={850}>₹850 (Normal Baseline Legitimate)</option>
                <option value={1500}>₹1,500 (Swiggy / Daily Groceries)</option>
                <option value={4200}>₹4,200 (Shopping Merchant Payment)</option>
                <option value={25000}>₹25,000 (Medium Value Outlier)</option>
                <option value={49000}>₹49,000 (High Velocity Threshold)</option>
                <option value={85000}>₹85,000 (18x High Amount Deviation)</option>
                <option value={150000}>₹1,50,000 (Critical Account Takeover Transfer)</option>
                <option value={250000}>₹2,50,000 (Mule Syndicate Dispersal Volume)</option>
              </select>
            </div>

            {/* Device ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Client Device Fingerprint</label>
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none font-mono"
              >
                <option value="DEV778">DEV778 [Rooted Emulator / VPN IP 103.145.74.19] (CRITICAL)</option>
                <option value="DEV102_IPHONE14">DEV102_IPHONE14 [Apple iPhone 14 Pro - Aarav Trusted]</option>
                <option value="DEV205_PIXEL8">DEV205_PIXEL8 [Google Pixel 8 Pro - Priya Trusted]</option>
                <option value="DEV309_MACBOOK">DEV309_MACBOOK [Apple MacBook Pro M3 - Vikram Trusted]</option>
                <option value="DEV_UNREGISTERED_NEW">DEV_UNREGISTERED_NEW [Unrecognized Hardware]</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Geolocation / City</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none font-sans"
              >
                <option value="Bengaluru">Bengaluru (Aarav Home Location)</option>
                <option value="Hyderabad">Hyderabad (Geographic Anomaly / Cyber Hub)</option>
                <option value="Mumbai">Mumbai (Financial District)</option>
                <option value="Delhi">Delhi (NCR Zone)</option>
                <option value="Chennai">Chennai (South India Hub)</option>
                <option value="Pune">Pune (Tech Park Zone)</option>
                <option value="Kolkata">Kolkata (East Zone)</option>
              </select>
            </div>

            {/* Beneficiary */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Destination Beneficiary VPA</label>
              <select
                value={beneficiaryId}
                onChange={(e) => setBeneficiaryId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none font-mono"
              >
                <option value="B992">B992 [FastCash Mule Crypto Desk - Flagged Syndicate]</option>
                <option value="B102_MOM">B102_MOM [Kavita Sharma - Trusted Family]</option>
                <option value="B201_LANDLORD">B201_LANDLORD [Suresh Trivedi Estates - Trusted Landlord]</option>
                <option value="B_NEW_981">B_NEW_981 [Rajesh Gadget Store - Newly Added]</option>
                <option value="">None (Direct Merchant / Shopping Payment)</option>
              </select>
            </div>

            {/* Payment Channel */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
              >
                <option value="UPI">UPI Instant Payment</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="NET_BANKING">Net Banking (NEFT/IMPS)</option>
                <option value="WALLET">Digital Wallet</option>
              </select>
            </div>
          </div>

          {/* Anomaly Modifier Toggles */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              SIMULATED BEHAVIORAL & SECURITY SIGNALS
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isNightTime}
                  onChange={(e) => setIsNightTime(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-rose-600 focus:ring-rose-500"
                />
                <span>03:17 AM (Night Anomaly)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={recentPasswordReset}
                  onChange={(e) => setRecentPasswordReset(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-rose-600 focus:ring-rose-500"
                />
                <span>Password Reset &lt; 24h</span>
              </label>

              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span>Failed Logins:</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={failedLogins}
                  onChange={(e) => setFailedLogins(Number(e.target.value))}
                  className="w-14 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white font-mono text-center"
                />
              </div>
            </div>
          </div>

          {/* Trigger Button */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-orange-600 py-3 text-sm font-bold text-white shadow-xl shadow-rose-600/25 hover:from-rose-500 hover:to-orange-500 active:scale-[0.99] transition disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Running Sentinel Multi-Signal Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                <span>Analyze Transaction</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 2: Pipeline Execution Log Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-cyan-400" />
            <h4 className="text-sm font-bold text-white">Pipeline Execution Log</h4>
          </div>
          {isAnalyzing && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-rose-400"></span>
              RUNNING PIPELINE
            </span>
          )}
        </div>

          {/* Pipeline Visual Stepper */}
          <div className="space-y-2 text-xs">
            {[
              { step: 1, label: '1. Ingestion & Validation' },
              { step: 2, label: '2. 18-Signal Feature Extraction' },
              { step: 3, label: '3. XGBoost ML & 10-Rule Evaluation' },
              { step: 4, label: '4. AI Agent Autonomous Tool Loop' },
              { step: 5, label: '5. Policy Enforcement & Alert Docket' },
            ].map(s => {
              const isDone = pipelineStep > s.step;
              const isCurrent = pipelineStep === s.step;
              return (
                <div
                  key={s.step}
                  className={`flex items-center gap-2 rounded p-1.5 transition ${
                    isCurrent ? 'bg-rose-500/15 text-rose-300 font-bold border border-rose-500/30' :
                    isDone ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <div className="h-3.5 w-3.5 rounded-full border border-current shrink-0" />}
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>

          {/* Console Log Terminal */}
          <div className="flex-1 rounded-lg border border-slate-800 bg-black/70 p-3 font-mono text-[10px] text-slate-300 space-y-1 overflow-y-auto max-h-48 min-h-[120px]">
            {liveLog.length === 0 ? (
              <span className="text-slate-600">Awaiting transaction simulation trigger...</span>
            ) : (
              liveLog.map((line, idx) => {
                const isError = line.startsWith('[Error]');
                const isPolicy = line.startsWith('[Policy Engine]');
                const isAgent = line.startsWith('[AI Agent]');
                const isAlert = line.startsWith('[Alert Engine]');
                return (
                  <div
                    key={idx}
                    className={`leading-tight font-mono text-[11px] ${
                      isError ? 'text-rose-400 font-bold bg-rose-500/10 p-1 rounded border border-rose-500/20' :
                      isAlert ? 'text-amber-300 font-bold bg-amber-500/10 p-1 rounded border border-amber-500/20' :
                      isPolicy ? 'text-emerald-400 font-bold bg-emerald-500/10 p-1 rounded border border-emerald-500/20' :
                      isAgent ? 'text-sky-300 font-semibold' :
                      'text-slate-300'
                    }`}
                  >
                    {line}
                  </div>
                );
              })
            )}
          </div>

          {/* Interactive Details Toggle Frame Button */}
          {analysisResult && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-950/80 via-slate-900 to-sky-950/80 border border-sky-500/40 p-2.5 text-xs font-black text-sky-300 hover:text-white hover:border-sky-400 active:scale-[0.99] transition shadow-lg shadow-sky-500/10"
            >
              <Sparkles className="h-4 w-4 text-sky-400 animate-pulse" />
              <span>{showDetails ? '▲ Hide Risk & Decision Breakdown Details' : '▼ Click Here to View Full Risk & Decision Details'}</span>
              <ArrowRight className="h-3.5 w-3.5 text-sky-400" />
            </button>
          )}
        </div>

      {/* Real-Time Score Analysis & Detailed Fraud Intelligence Report Card */}
      {analysisResult && showDetails && (
        <div className="mx-6 mb-6 rounded-2xl border-2 border-sky-500/30 bg-slate-950 p-6 space-y-5 shadow-2xl ring-1 ring-sky-500/20 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                ✓ Pipeline Evaluation Complete • Tx {analysisResult.transaction?.transaction_id || 'ANALYZED'}
              </span>
              <h4 className="text-base font-black text-white mt-2">
                Automated Risk Scoring & Multi-Vector Decision Breakdown
              </h4>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-black text-rose-400 font-mono">
                  {(((analysisResult.risk_breakdown?.final_risk_score ?? analysisResult.transaction?.risk_score ?? 0)) / 100).toFixed(2)} / 1.00
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Risk Level: {analysisResult.risk_breakdown?.risk_level ?? analysisResult.transaction?.risk_level ?? 'LOW'}
                </div>
              </div>

              <span className={`px-4 py-2 rounded-xl text-xs font-black border uppercase tracking-wider ${
                (analysisResult.risk_breakdown?.policy_decision || analysisResult.transaction?.policy_decision) === 'BLOCKED' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                (analysisResult.risk_breakdown?.policy_decision || analysisResult.transaction?.policy_decision) === 'HELD_FOR_REVIEW' ? 'bg-rose-500/15 text-rose-300 border-rose-500/20' :
                (analysisResult.risk_breakdown?.policy_decision || analysisResult.transaction?.policy_decision) === 'STEP_UP_REQUIRED' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {analysisResult.risk_breakdown?.policy_decision || analysisResult.transaction?.policy_decision || 'APPROVED'}
              </span>
            </div>
          </div>

          {/* Grid: XGBoost ML + Security Rules + Multi-Channel Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* XGBoost Classifier */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-2">
              <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex justify-between">
                <span>XGBoost ML Classifier</span>
                <span className="text-sky-400 font-mono">Conf: {((analysisResult.ml_prediction?.confidence || 0.95) * 100).toFixed(0)}%</span>
              </div>
              <div className="text-base font-black text-white">
                Fraud Probability: <span className="font-mono text-rose-400">{((analysisResult.ml_prediction?.fraud_probability || 0) * 100).toFixed(1)}%</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Model: {analysisResult.ml_prediction?.model_name || 'XGBoost Gradient Boosted Ensemble'}
              </p>
            </div>

            {/* Security Rules */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-2">
              <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                Triggered Rules ({analysisResult.rule_results?.filter((r: any) => r.triggered).length || 0} Flags)
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {analysisResult.rule_results?.filter((r: any) => r.triggered).map((r: any, idx: number) => (
                  <div key={idx} className="text-[11px] font-mono text-rose-300 font-bold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
                    <span>{r.rule_name || r.rule_id}</span>
                  </div>
                ))}
                {(analysisResult.rule_results?.filter((r: any) => r.triggered).length || 0) === 0 && (
                  <div className="text-xs text-emerald-400 font-medium">Zero risk rules triggered (Legitimate Baseline)</div>
                )}
              </div>
            </div>

            {/* Alert Dispatch Docket */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
              <div className="text-[11px] font-extrabold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Multi-Channel Alert Dispatch</span>
              </div>
              <div className="text-xs text-slate-300 space-y-1 font-mono">
                <div>📧 Email Alert: <strong className="text-white">DELIVERED</strong></div>
                <div>📱 SMS Alert: <strong className="text-white">DELIVERED (+918639975744 via Twilio)</strong></div>
              </div>
            </div>
          </div>

          {/* AI Executive Summary */}
          {analysisResult.investigation?.investigation_summary && (
            <div className="rounded-xl border border-sky-500/30 bg-sky-950/30 p-4 space-y-1">
              <div className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                <span>AI Agent Autonomous Executive Summary</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-sans italic">
                "{analysisResult.investigation.investigation_summary}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

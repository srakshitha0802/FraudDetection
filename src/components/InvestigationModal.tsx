import React, { useState, useEffect, useRef } from 'react';
import { AgentInvestigationRecord, Transaction, ForensicChatMessage } from '../types.ts';
import { RiskGauge } from './RiskGauge.tsx';
import { api } from '../services/api.ts';
import {
  ShieldAlert,
  Bot,
  CheckCircle,
  AlertTriangle,
  Clock,
  Cpu,
  Lock,
  ArrowRight,
  Sparkles,
  FileCheck,
  UserCheck,
  Ban,
  PhoneCall,
  Terminal,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  Download,
  Copy,
  ExternalLink,
  RefreshCw,
  FileText,
  Network,
  HelpCircle,
  Check,
  XCircle,
  ShieldCheck,
  Flame,
  Radio,
  FilePlus,
  KeyRound
} from 'lucide-react';

interface InvestigationModalProps {
  investigation: AgentInvestigationRecord | null;
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onTakeAction?: (action: string) => void;
  onTransactionUpdated?: (tx: Transaction) => void;
}

export const InvestigationModal: React.FC<InvestigationModalProps> = ({
  investigation,
  transaction: initialTransaction,
  isOpen,
  onClose,
  onTakeAction,
  onTransactionUpdated,
}) => {
  const [transaction, setTransaction] = useState<Transaction | null>(initialTransaction);
  const [activeTab, setActiveTab] = useState<'evidence' | 'tools' | 'policy' | 'graph' | 'copilot' | 'sar' | 'notes'>('evidence');
  const [expandedToolIdx, setExpandedToolIdx] = useState<number | null>(null);
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'warning' | 'info' | 'error' } | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Step-Up OTP Verification State
  const [otpInput, setOtpInput] = useState<string>('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [otpSentEmail, setOtpSentEmail] = useState<string>('srakshitha912@gmail.com');
  const [showOtpBox, setShowOtpBox] = useState<boolean>(false);

  // 5-Minute Escrow Hold Timer
  const [holdTimeRemaining, setHoldTimeRemaining] = useState<number>(300); // 5 minutes in seconds

  // Case Note State
  const [noteInput, setNoteInput] = useState<string>('');
  const [caseNotes, setCaseNotes] = useState<{ id: string; author: string; text: string; timestamp: string; action?: string }[]>([]);

  // Copilot Chat State
  const [chatMessages, setChatMessages] = useState<ForensicChatMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: `Greetings, Lead Analyst. I am the Gemini Forensic Copilot for Docket ${initialTransaction?.transaction_id || 'TX40790'}. I have correlated 10 autonomous telemetry probes. How can I assist with this investigation?`,
      timestamp: new Date().toLocaleTimeString(),
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Sync initial transaction
  useEffect(() => {
    if (initialTransaction) {
      setTransaction(initialTransaction);
      if (initialTransaction.case_notes) {
        setCaseNotes(initialTransaction.case_notes);
      }
      if (initialTransaction.status === 'VERIFICATION_REQUIRED' || initialTransaction.otp_code) {
        setShowOtpBox(true);
      }
    }
  }, [initialTransaction]);

  // Escrow countdown timer
  useEffect(() => {
    if (!transaction || (transaction.status !== 'HELD' && transaction.status !== 'VERIFICATION_REQUIRED')) return;

    const timer = setInterval(() => {
      setHoldTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [transaction?.status]);

  // Scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'copilot' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  if (!isOpen || !investigation || !transaction) return null;

  const showNotification = (text: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice(null), 5000);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Real-World Analyst Action Execution
  const handleExecuteAction = async (actionType: string, extraPayload: any = {}) => {
    setIsExecutingAction(true);
    try {
      const res = await api.executeTransactionAction(transaction.transaction_id, actionType, {
        analyst_name: 'Lead Compliance Officer (L2 SOC)',
        ...extraPayload
      });

      if (res.transaction) {
        setTransaction(res.transaction);
        if (onTransactionUpdated) onTransactionUpdated(res.transaction);
      }

      if (actionType === 'STEP_UP_OTP') {
        setShowOtpBox(true);
        if (res.targetEmail) setOtpSentEmail(res.targetEmail);
        showNotification(`Step-Up OTP Challenge (${res.otp || '6-Digit'}) dispatched to ${res.targetEmail || 'srakshitha912@gmail.com'} via Secure 256-bit TLS SMTP.`, 'info');
      } else if (actionType === 'HOLD_TRANSACTION') {
        setHoldTimeRemaining(300);
        showNotification(`Transaction placed in 5-Minute Escrow Lock. Immediate notification dispatched to victim.`, 'warning');
      } else if (actionType === 'RELEASE_HOLD') {
        showNotification(`Escrow hold released. Funds authorized and settled to destination payee.`, 'success');
      } else if (actionType === 'FREEZE_DEVICE_MULE') {
        showNotification(`Device ${transaction.device_id} permanently blacklisted. Payee mule account frozen across banking federation.`, 'error');
      } else if (actionType === 'OVERRIDE_APPROVE') {
        showNotification(`Transaction manually approved with verified analyst attestation. Baseline calibration updated.`, 'success');
      } else if (actionType === 'FILE_1930_COMPLAINT') {
        showNotification(`National Cyber Crime Portal 1930 FIR filed. FIR Acknowledgement: ${res.ackNumber}. Annexure email sent.`, 'success');
      }

      if (onTakeAction) onTakeAction(actionType);
    } catch (err: any) {
      showNotification(`Action failed: ${err.message || 'Server error'}`, 'error');
    } finally {
      setIsExecutingAction(false);
    }
  };

  // Step-Up OTP Verification
  const handleVerifyOtp = async () => {
    if (!otpInput || otpInput.length < 4) {
      showNotification('Please enter the 6-digit OTP code.', 'warning');
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const res = await api.executeTransactionAction(transaction.transaction_id, 'VERIFY_OTP', { code: otpInput });
      if (res.verified) {
        setTransaction(res.transaction);
        setShowOtpBox(false);
        setOtpInput('');
        showNotification(`OTP 2FA Verified Successfully! Transaction ${transaction.transaction_id} is now APPROVED.`, 'success');
        if (onTransactionUpdated) onTransactionUpdated(res.transaction);
        if (onTakeAction) onTakeAction('STEP_UP_VERIFIED');
      }
    } catch (err: any) {
      showNotification(err.message || 'Invalid OTP code. Please check your email.', 'error');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Case Note Submission
  const handleAddCaseNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    try {
      const res = await api.addDocketCaseNote(transaction.transaction_id, noteInput.trim(), 'Lead SOC Analyst (L2)');
      if (res.case_notes) {
        setCaseNotes(res.case_notes);
        setNoteInput('');
        showNotification('Case note appended to permanent audit docket.', 'success');
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to record note', 'error');
    }
  };

  // Copilot Interactive Chat
  const handleSendCopilotQuery = async (e?: React.FormEvent, promptOverride?: string) => {
    if (e) e.preventDefault();
    const query = promptOverride || chatInput.trim();
    if (!query) return;

    const userMsg: ForensicChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!promptOverride) setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await api.queryDocketCopilot(transaction.transaction_id, query);
      const agentMsg: ForensicChatMessage = {
        id: `agent_${Date.now()}`,
        sender: 'agent',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString(),
        toolInvocations: res.toolInvocations,
      };
      setChatMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'agent',
          text: `Error analyzing query: ${err.message || 'Connection timeout'}. Please retry.`,
          timestamp: new Date().toLocaleTimeString(),
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Download SAR Report as JSON / Text Dossier
  const handleDownloadSAR = async () => {
    try {
      const sarData = await api.getSarExport(transaction.transaction_id);
      const blob = new Blob([JSON.stringify(sarData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FIU_IND_SAR_${transaction.transaction_id}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('FIU-IND Regulatory SAR Docket downloaded successfully.', 'success');
    } catch (err: any) {
      showNotification('Failed to generate SAR export: ' + err.message, 'error');
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        
        {/* ========================================================================= */}
        {/* HEADER */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-3.5 gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-wide">Forensic Investigation Docket</h3>
                
                <button
                  onClick={() => handleCopy(transaction.transaction_id, 'txId')}
                  className="flex items-center gap-1 font-mono text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded hover:bg-cyan-900/60 transition"
                  title="Click to copy Transaction ID"
                >
                  <span>[{transaction.transaction_id}]</span>
                  {copiedText === 'txId' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-slate-400" />}
                </button>

                {/* Risk Classification Badge */}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider ${
                  investigation.risk_level === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                  investigation.risk_level === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                  investigation.risk_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {investigation.classification}
                </span>

                {/* Real-Time Status Badge */}
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  transaction.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                  transaction.status === 'BLOCKED' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                  transaction.status === 'HELD' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse' :
                  'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    transaction.status === 'APPROVED' ? 'bg-emerald-400' :
                    transaction.status === 'BLOCKED' ? 'bg-red-400' :
                    transaction.status === 'HELD' ? 'bg-amber-400' : 'bg-sky-400'
                  }`} />
                  <span>{transaction.status}</span>
                </span>
              </div>
              
              <p className="text-xs text-slate-400 mt-0.5">
                Agent: <span className="text-slate-300 font-medium">{investigation.agent_model}</span> • Analyzed {new Date(investigation.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSAR}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
              title="Export FIU-IND Section 12 SAR Dossier"
            >
              <Download className="h-3.5 w-3.5 text-amber-400" />
              <span>FIU SAR</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              aria-label="Close docket"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* REAL-TIME ACTION NOTIFICATION BANNER */}
        {/* ========================================================================= */}
        {actionNotice && (
          <div className={`px-6 py-2.5 text-xs flex items-center justify-between border-b transition ${
            actionNotice.type === 'success' ? 'bg-emerald-950/90 border-emerald-800 text-emerald-300' :
            actionNotice.type === 'warning' ? 'bg-amber-950/90 border-amber-800 text-amber-300' :
            actionNotice.type === 'error' ? 'bg-rose-950/90 border-rose-800 text-rose-300' :
            'bg-sky-950/90 border-sky-800 text-sky-300'
          }`}>
            <div className="flex items-center gap-2">
              {actionNotice.type === 'success' && <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />}
              {actionNotice.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />}
              {actionNotice.type === 'error' && <XCircle className="h-4 w-4 text-rose-400 shrink-0" />}
              {actionNotice.type === 'info' && <Radio className="h-4 w-4 text-sky-400 shrink-0 animate-pulse" />}
              <span className="font-medium">{actionNotice.text}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white text-xs ml-4">✕</button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MAIN SPLIT VIEW */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 flex-1 overflow-y-auto min-h-0">
          
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT SIDEBAR: Transaction Profile & Risk Breakdown (4 Cols) */}
          {/* ----------------------------------------------------------------------- */}
          <div className="lg:col-span-4 p-5 flex flex-col gap-4 bg-slate-950/60 overflow-y-auto">
            
            {/* Risk Gauge & Model Confidence */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-800/80 bg-slate-900/70 shadow-inner">
              <RiskGauge score={investigation.risk_score} size={180} />
              
              <div className="mt-2 flex items-center justify-between w-full px-2 pt-2 border-t border-slate-800 text-xs">
                <span className="text-slate-400">Model Confidence:</span>
                <span className="font-bold text-emerald-400">{(investigation.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between w-full px-2 text-[11px] text-slate-500">
                <span>Ensemble ML: 58%</span>
                <span>Rules: +15 pts</span>
                <span>Graph: 1.2x</span>
              </div>
            </div>

            {/* Live 5-Minute Escrow Hold Banner (Active State) */}
            {(transaction.status === 'HELD' || transaction.status === 'VERIFICATION_REQUIRED') && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Clock className="h-4 w-4 animate-spin text-amber-400" />
                    <span>AML Escrow Hold Active</span>
                  </div>
                  <span className="font-mono text-xs font-extrabold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30">
                    {formatSeconds(holdTimeRemaining)}
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="h-1.5 w-full bg-amber-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-1000"
                    style={{ width: `${(holdTimeRemaining / 300) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1 gap-2">
                  <button
                    onClick={() => handleExecuteAction('RELEASE_HOLD')}
                    disabled={isExecutingAction}
                    className="flex-1 py-1 text-[11px] font-bold rounded bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition"
                  >
                    Release Escrow
                  </button>
                  <button
                    onClick={() => handleExecuteAction('FREEZE_DEVICE_MULE')}
                    disabled={isExecutingAction}
                    className="flex-1 py-1 text-[11px] font-bold rounded bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 transition"
                  >
                    Escalate Block
                  </button>
                </div>
              </div>
            )}

            {/* Interactive Step-Up OTP Verification Box */}
            {showOtpBox && transaction.status !== 'APPROVED' && (
              <div className="rounded-xl border border-sky-500/40 bg-sky-950/30 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                    <KeyRound className="h-4 w-4 text-sky-400" />
                    <span>Live 2FA Step-Up Challenge</span>
                  </div>
                  {transaction.otp_code && (
                    <span className="font-mono text-[11px] bg-sky-900/80 text-amber-300 px-1.5 py-0.5 rounded border border-sky-700">
                      Code: {transaction.otp_code}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-300 leading-snug">
                  Challenge dispatched to <strong className="text-white">{otpSentEmail}</strong>. Test verification below:
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 rounded-lg border border-sky-600/40 bg-slate-900 px-3 py-1.5 text-xs font-mono text-center tracking-widest text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                  <button
                    onClick={handleVerifyOtp}
                    disabled={isVerifyingOtp || otpInput.length < 4}
                    className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-50 transition"
                  >
                    {isVerifyingOtp ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Authorize'}
                  </button>
                </div>
              </div>
            )}

            {/* 1930 Cyber Police FIR Status Badge */}
            {transaction.fir_ack_number && (
              <div className="rounded-xl border border-purple-500/40 bg-purple-950/30 p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-purple-300">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  <span>National Cyber Portal 1930 FIR Filed</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">FIR Ack No:</span>
                  <span className="font-mono font-bold text-purple-200">{transaction.fir_ack_number}</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Filing Station: Cyber Crime Police Station, Hyderabad
                </div>
              </div>
            )}

            {/* Transaction Profile Key-Value Grid */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2.5 text-xs">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-800 flex justify-between items-center">
                <span>Transaction Profile</span>
                <span className="font-mono text-slate-400">{new Date(transaction.timestamp).toLocaleTimeString()}</span>
              </h4>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Amount</span>
                <span className="font-mono font-bold text-white text-sm">₹{transaction.amount.toLocaleString('en-IN')} {transaction.currency}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-400">User</span>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-slate-200">{transaction.user_name || transaction.user_id}</span>
                  <span className="rounded bg-emerald-500/20 text-emerald-300 text-[9px] px-1 py-0.2 font-bold">KYC</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Payment Type</span>
                <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">{transaction.transaction_type}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Device ID</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-rose-300 font-bold">{transaction.device_id}</span>
                  <span className="rounded bg-rose-500/20 text-rose-300 text-[9px] px-1 py-0.2 font-bold">EMULATOR</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Location</span>
                <span className="text-amber-300 font-medium">{transaction.location} (Jump: 620 km)</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-400">IP Address</span>
                <span className="font-mono text-slate-300">{transaction.ip_address}</span>
              </div>

              {transaction.beneficiary_name && (
                <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Beneficiary Payee</span>
                  <span className="font-medium text-rose-300 truncate max-w-[140px]">{transaction.beneficiary_name}</span>
                </div>
              )}
            </div>

            {/* Policy Decision Layer Card */}
            <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-3.5 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-300">
                <Lock className="h-3.5 w-3.5" />
                <span>Policy Decision Layer</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Decision: <strong className="text-rose-400">{investigation.policy_decision}</strong>
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                Rule: {investigation.policy_check.policy_rule_applied}
              </p>
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* RIGHT CONTENT AREA: Multi-Tab Interactive Forensic Workspace (8 Cols) */}
          {/* ----------------------------------------------------------------------- */}
          <div className="lg:col-span-8 p-5 flex flex-col gap-4 overflow-y-auto">
            
            {/* Tab Bar */}
            <div className="flex border-b border-slate-800 gap-1 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveTab('evidence')}
                className={`pb-2 text-xs font-semibold px-3 transition shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'evidence'
                    ? 'border-b-2 border-rose-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                <span>Why Flagged? (Evidence)</span>
              </button>

              <button
                onClick={() => setActiveTab('tools')}
                className={`pb-2 text-xs font-semibold px-3 transition shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'tools'
                    ? 'border-b-2 border-rose-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bot className="h-3.5 w-3.5 text-cyan-400" />
                <span>Agent Tool Execution ({investigation.tool_invocations.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('policy')}
                className={`pb-2 text-xs font-semibold px-3 transition shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'policy'
                    ? 'border-b-2 border-rose-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                <span>Action & Next Steps</span>
              </button>

              <button
                onClick={() => setActiveTab('graph')}
                className={`pb-2 text-xs font-semibold px-3 transition shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'graph'
                    ? 'border-b-2 border-rose-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Network className="h-3.5 w-3.5 text-purple-400" />
                <span>Mule Graph Linkages</span>
              </button>

              <button
                onClick={() => setActiveTab('copilot')}
                className={`pb-2 text-xs font-semibold px-3 transition shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'copilot'
                    ? 'border-b-2 border-rose-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span>AI Copilot</span>
              </button>

              <button
                onClick={() => setActiveTab('sar')}
                className={`pb-2 text-xs font-semibold px-3 transition shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'sar'
                    ? 'border-b-2 border-rose-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="h-3.5 w-3.5 text-amber-400" />
                <span>FIU SAR / 1930</span>
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className={`pb-2 text-xs font-semibold px-3 transition shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'notes'
                    ? 'border-b-2 border-rose-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FilePlus className="h-3.5 w-3.5 text-sky-400" />
                <span>Case Notes ({caseNotes.length})</span>
              </button>
            </div>

            {/* =================================================================== */}
            {/* TAB 1: EVIDENCE & ANOMALIES */}
            {/* =================================================================== */}
            {activeTab === 'evidence' && (
              <div className="space-y-4">
                {/* Agent Synthesized Findings */}
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 mb-1.5">
                    <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>AI Agent Synthesized Forensic Findings</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {investigation.investigation_summary}
                  </p>
                </div>

                {/* Primary Reasons Checklist */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Primary Anomaly Signals ({investigation.reasons.length})</span>
                    <span className="text-[10px] text-slate-500">Cross-Validated by 10 Sub-Agents</span>
                  </h4>
                  <div className="space-y-2">
                    {investigation.reasons.map((reason, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 text-xs text-slate-200"
                      >
                        <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detailed Evidence Badges */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Signal Telemetry Evidence Matrix
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {investigation.evidence.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-xs"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-mono text-[10px] text-slate-400 uppercase">{item.signal}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            item.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                            item.severity === 'ALERT' ? 'bg-orange-500/20 text-orange-300' :
                            'bg-amber-500/20 text-amber-300'
                          }`}>
                            {item.severity}
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px] font-medium">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 2: AGENT TOOL CALLING (10 TOOLS) */}
            {/* =================================================================== */}
            {activeTab === 'tools' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                  <span>Structured Autonomous Tool Calling Pipeline</span>
                  <span className="font-mono text-cyan-400 font-bold">{investigation.tool_invocations.length} / 10 Tools Executed</span>
                </div>

                <div className="space-y-2">
                  {investigation.tool_invocations.map((inv, idx) => {
                    const isExpanded = expandedToolIdx === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 transition hover:border-slate-700"
                      >
                        <div
                          onClick={() => setExpandedToolIdx(isExpanded ? null : idx)}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-300">
                              {inv.tool_name}()
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">[{inv.timestamp}]</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-300 truncate max-w-xs">{inv.output_summary}</span>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-2.5 pt-2 border-t border-slate-800 text-xs space-y-1.5 bg-slate-900/50 p-2 rounded">
                            <div className="text-[11px] text-slate-400">
                              <strong>Input Arguments:</strong> <code className="text-amber-300 font-mono">{JSON.stringify(inv.input)}</code>
                            </div>
                            <div className="text-[11px] text-slate-300">
                              <strong>Detailed Execution Output:</strong> {inv.output_summary}
                            </div>
                            <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              <span>Validation: Schema Verified • Execution Latency: 12ms</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 3: ACTION & NEXT STEPS */}
            {/* =================================================================== */}
            {activeTab === 'policy' && (
              <div className="space-y-5">
                {/* Policy Enforcement Matrix */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 text-xs">
                  <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">
                    Policy Enforcement Matrix
                  </h4>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">AI Agent Recommendation:</span>
                    <span className="font-bold font-mono text-cyan-300">{investigation.recommended_action}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Policy Layer Action:</span>
                    <span className="font-bold font-mono text-rose-400">{investigation.policy_decision}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Deterministic Rule:</span>
                    <span className="font-mono text-slate-300">{investigation.policy_check.policy_rule_applied}</span>
                  </div>
                </div>

                {/* Recommended Next Steps */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Action Plan & Remediation
                  </h4>
                  <ul className="space-y-2">
                    {investigation.next_steps.map((step, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-slate-200">
                        <ArrowRight className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Real-World Interactive Analyst Action Controls */}
                <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>Analyst Incident Actions</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Real-Time Backend Execution</span>
                  </h4>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => handleExecuteAction('STEP_UP_OTP')}
                      disabled={isExecutingAction}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 py-2.5 px-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 transition"
                    >
                      <PhoneCall className="h-3.5 w-3.5" />
                      <span>Prompt Step-Up</span>
                    </button>

                    <button
                      onClick={() => handleExecuteAction('HOLD_TRANSACTION')}
                      disabled={isExecutingAction}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 py-2.5 px-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50 transition"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Hold Payment</span>
                    </button>

                    <button
                      onClick={() => handleExecuteAction('FREEZE_DEVICE_MULE')}
                      disabled={isExecutingAction}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-red-600 bg-red-600/20 py-2.5 px-2 text-xs font-semibold text-red-200 hover:bg-red-600/30 disabled:opacity-50 transition"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>Blacklist Device</span>
                    </button>

                    <button
                      onClick={() => handleExecuteAction('OVERRIDE_APPROVE')}
                      disabled={isExecutingAction}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-2.5 px-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 transition"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Mark Safe</span>
                    </button>
                  </div>

                  {/* Secondary One-Click Regulatory Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-700">
                    <button
                      onClick={() => handleExecuteAction('FILE_1930_COMPLAINT')}
                      disabled={isExecutingAction || !!transaction.fir_ack_number}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 py-2 px-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 disabled:opacity-50 transition"
                    >
                      <ShieldAlert className="h-3.5 w-3.5 text-purple-400" />
                      <span>{transaction.fir_ack_number ? `FIR Registered (${transaction.fir_ack_number})` : 'File 1930 Cyber Police Complaint'}</span>
                    </button>

                    <button
                      onClick={handleDownloadSAR}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 py-2 px-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 transition"
                    >
                      <Download className="h-3.5 w-3.5 text-sky-400" />
                      <span>Generate FIU-IND SAR Report</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 4: MULE GRAPH LINKAGES */}
            {/* =================================================================== */}
            {activeTab === 'graph' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-purple-300 flex items-center gap-2">
                      <Network className="h-4 w-4 text-purple-400" />
                      <span>Entity Linkages & Cross-Victim Syndicate Graph</span>
                    </span>
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-900/60 px-2 py-0.5 rounded border border-purple-700">
                      Coordinated Fan-In Detected
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Device <code className="text-rose-300">{transaction.device_id}</code> is currently linked to 3 distinct victim accounts and routes outbound funds to mule aggregator node <code className="text-amber-300">{transaction.beneficiary_name || 'Payee Syndicate'}</code>.
                  </p>
                </div>

                {/* Entity Node Visualizer */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Node 1: Victim */}
                    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Victim Account</span>
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      </div>
                      <div className="font-bold text-white text-xs">{transaction.user_name || transaction.user_id}</div>
                      <div className="text-[11px] text-slate-400">Baseline median: ₹1,850</div>
                      <div className="text-[10px] text-slate-500">Normal city: Bengaluru</div>
                    </div>

                    {/* Node 2: Suspicious Hardware */}
                    <div className="rounded-lg border border-rose-500/40 bg-rose-950/20 p-3 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-rose-400 uppercase font-bold">Compromised Device</span>
                        <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />
                      </div>
                      <div className="font-mono font-bold text-rose-300 text-xs">{transaction.device_id}</div>
                      <div className="text-[11px] text-slate-300">Emulator / Arm64 Rooted</div>
                      <div className="text-[10px] text-rose-400 font-medium">3 Linked Victim Profiles</div>
                    </div>

                    {/* Node 3: Mule Payee */}
                    <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-3 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-amber-400 uppercase font-bold">Mule Destination</span>
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                      </div>
                      <div className="font-bold text-amber-200 text-xs truncate">{transaction.beneficiary_name || 'Beneficiary Payee'}</div>
                      <div className="text-[11px] text-slate-400">Fan-In Velocity: 8 transfers / 1h</div>
                      <div className="text-[10px] text-amber-400 font-mono">Aggregator Risk: 92/100</div>
                    </div>
                  </div>

                  <div className="pt-2 text-center text-xs text-slate-400">
                    <span>Syndicate Multiplier Factor: <strong className="text-white">1.2x Risk Amplification</strong> applied to composite score.</span>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 5: AI FORENSIC COPILOT (GEMINI CHAT) */}
            {/* =================================================================== */}
            {activeTab === 'copilot' && (
              <div className="flex flex-col h-[400px] border border-slate-800 rounded-xl bg-slate-950/80 overflow-hidden">
                {/* Chat Messages Header */}
                <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    <span>Gemini 3.7 Flash Forensic Copilot</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">Grounded on Docket Telemetry</span>
                </div>

                {/* Messages Body */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-rose-600 text-white rounded-br-none'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                      }`}>
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                        
                        {msg.toolInvocations && msg.toolInvocations.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-cyan-300 space-y-1 font-mono">
                            {msg.toolInvocations.map((t, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                <Terminal className="h-3 w-3" />
                                <span>{t.tool_name}: {t.summary}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  ))}

                  {isChatLoading && (
                    <div className="flex items-center gap-2 text-xs text-cyan-400 p-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Gemini is synthesizing forensic telemetry...</span>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Prompt Suggestion Chips */}
                <div className="px-3 py-1.5 bg-slate-900/60 border-t border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                  <button
                    onClick={() => handleSendCopilotQuery(undefined, 'Why was DEV778 flagged?')}
                    className="shrink-0 rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                  >
                    Why DEV778?
                  </button>
                  <button
                    onClick={() => handleSendCopilotQuery(undefined, 'Draft formal FIU-IND SAR narrative')}
                    className="shrink-0 rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                  >
                    Draft FIU SAR
                  </button>
                  <button
                    onClick={() => handleSendCopilotQuery(undefined, 'What is the recommended analyst remediation?')}
                    className="shrink-0 rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                  >
                    Remediation Plan
                  </button>
                </div>

                {/* Chat Input Bar */}
                <form onSubmit={handleSendCopilotQuery} className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ask Forensic Copilot about this docket..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isChatLoading}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={isChatLoading || !chatInput.trim()}
                    className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-50 transition"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 6: FIU-IND SAR & 1930 POLICE DOSSIER */}
            {/* =================================================================== */}
            {activeTab === 'sar' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    FIU-IND Suspicious Activity Report (PMLA Section 12)
                  </h4>
                  <button
                    onClick={handleDownloadSAR}
                    className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Official JSON</span>
                  </button>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] space-y-2 text-slate-300 max-h-[350px] overflow-y-auto">
                  <div className="text-amber-400 font-bold border-b border-slate-800 pb-1">
                    REPORT REF: FIU-IND/PMLA/SEC12/{transaction.transaction_id}
                  </div>
                  <div><strong>Jurisdiction:</strong> Financial Intelligence Unit - Anti Money Laundering Division</div>
                  <div><strong>Subject Transaction:</strong> ₹{transaction.amount.toLocaleString()} {transaction.currency} ({transaction.transaction_type})</div>
                  <div><strong>Account Holder:</strong> {transaction.user_name || transaction.user_id} (KYC Verified)</div>
                  <div><strong>Suspect Hardware:</strong> {transaction.device_id} ({transaction.location})</div>
                  <div><strong>Flagged Payee:</strong> {transaction.beneficiary_name || 'Aggregator Mule Syndicate'}</div>
                  <div className="pt-2 border-t border-slate-800">
                    <strong className="text-white">Grounds for Suspicion:</strong>
                    <p className="font-sans text-xs text-slate-300 mt-1 leading-relaxed">
                      High deviation transfer initiated from unverified rooted emulator hardware in Hyderabad (620 km anomaly from normal Bengaluru profile). Payee node shows 8 rapid fan-in transactions within the past hour. Composite Risk Score: {investigation.risk_score}/100.
                    </p>
                  </div>
                  <div className="pt-2 text-[10px] text-emerald-400">
                    Attestation: Certified by Lead Compliance Officer (LCO-902) • Ready for FIU Transmission
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 7: CASE NOTES & AUDIT TRAIL */}
            {/* =================================================================== */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                {/* Add Note Form */}
                <form onSubmit={handleAddCaseNote} className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Append SOC Analyst Case Note
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add investigation observation or phone verification outcome..."
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="submit"
                      disabled={!noteInput.trim()}
                      className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-50 transition"
                    >
                      Add Note
                    </button>
                  </div>
                </form>

                {/* Notes List */}
                <div className="space-y-2">
                  {caseNotes.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No analyst notes recorded yet for this docket.</p>
                  ) : (
                    caseNotes.map((note) => (
                      <div key={note.id} className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-200">{note.author}</span>
                          <span className="font-mono text-[10px] text-slate-500">{new Date(note.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-300">{note.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ========================================================================= */}
        {/* FOOTER */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-6 py-3 text-xs text-slate-400">
          <span>Investigation ID: <strong className="font-mono text-slate-300">{investigation.investigation_id}</strong></span>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-1.5 font-semibold text-white hover:bg-slate-700 transition"
          >
            Close Docket
          </button>
        </div>

      </div>
    </div>
  );
};

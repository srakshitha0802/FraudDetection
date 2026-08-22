import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  Building,
  FileText,
  Lock,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  PhoneCall,
  MapPin,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2,
  ExternalLink,
  Smartphone,
  Globe,
  Search,
  Download,
  QrCode,
  Shield,
  HelpCircle,
  X,
  Bot,
  Scale,
  GitBranch,
  Play
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { AuthUser } from '../../types.ts';
import { CyberAdvisorModal } from '../CyberAdvisorModal.tsx';
import { EmergencyPanicModal } from '../EmergencyPanicModal.tsx';
import { ThreatSimulatorModal } from '../ThreatSimulatorModal.tsx';
import { RbiDisputeModal } from '../RbiDisputeModal.tsx';
import { SimulatorTestView } from './SimulatorTestView.tsx';

interface PersonalDashboardViewProps {
  currentUser: AuthUser | null;
  onNavigate: (tab: string, extraData?: any) => void;
}

export const PersonalDashboardView: React.FC<PersonalDashboardViewProps> = ({
  currentUser,
  onNavigate
}) => {
  const [cards, setCards] = useState<any[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quickScanQuery, setQuickScanQuery] = useState('');

  // Modals state
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [isPanicOpen, setIsPanicOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [selectedDisputeTxId, setSelectedDisputeTxId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cardsRes, accRes, txRes, cmpRes] = await Promise.allSettled([
        api.getPersonalCards(),
        api.getPersonalAccount(),
        api.getPersonalTransactions(),
        api.getPoliceComplaints()
      ]);

      if (cardsRes.status === 'fulfilled' && Array.isArray(cardsRes.value)) {
        setCards(cardsRes.value);
      }
      if (accRes.status === 'fulfilled' && accRes.value) {
        setAccount(accRes.value);
      }
      if (txRes.status === 'fulfilled' && txRes.value) {
        setTransactions(txRes.value.transactions || []);
        setSummary(txRes.value.summary || null);
      }
      if (cmpRes.status === 'fulfilled' && Array.isArray(cmpRes.value)) {
        setComplaints(cmpRes.value);
      }
    } catch (err) {
      console.warn('Dashboard data loader notice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const fraudTxns = transactions.filter(t => t.risk_level === 'CRITICAL' || t.risk_level === 'HIGH');
  const blockedCardsCount = cards.filter(c => c.isBlocked).length;

  return (
    <div className="space-y-6 pb-12">
      {/* User Welcome & Overall Protection Status */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative">
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="h-16 w-16 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-lg"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-2xl">
                  {currentUser?.name ? currentUser.name.charAt(0) : 'R'}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-slate-900 text-white text-[10px]">
                ✓
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Hi, {currentUser?.name || 'Rakshitha S'}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Sentinel PayGuard Active</span>
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-1.5 font-medium">
                Linked UPI: <span className="text-white font-mono">{currentUser?.upiHandle || 'srakshitha@okhdfcbank'}</span> • Bank: <span className="text-white">HDFC Bank & ICICI Bank</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                City: Bengaluru • Emergency Cyber Police Helpline: <strong className="text-rose-400 font-mono font-bold">1930</strong>
              </p>
            </div>
          </div>

          {/* Quick Action Top Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsPanicOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 border border-rose-500/40 px-4 py-2.5 text-xs font-bold text-white transition shadow-lg shadow-rose-600/25 animate-pulse"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>1-Click Panic Freeze</span>
            </button>

            <button
              onClick={() => setIsAdvisorOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 px-4 py-2.5 text-xs font-bold text-white transition shadow-md shadow-sky-600/20"
            >
              <Bot className="h-4 w-4" />
              <span>Ask AI Legal Advisor</span>
            </button>

            <button
              onClick={() => onNavigate('data-export')}
              className="flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-700 hover:border-slate-600 transition shadow-sm"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <span>Download Statements</span>
            </button>
          </div>
        </div>
      </div>

      {/* Payment Transaction Simulator & Automated Verification Test Harness */}
      <SimulatorTestView onAnalysisComplete={() => loadData()} />

      {/* Advanced Real-World Feature Action Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hub 1: AI Cyber Advisor */}
        <div
          onClick={() => setIsAdvisorOpen(true)}
          className="cursor-pointer rounded-3xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 via-slate-900 to-slate-900 p-6 space-y-3 hover:border-sky-500/60 hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Bot className="h-6 w-6" />
            </div>
            <span className="text-xs font-bold text-sky-400 group-hover:translate-x-1 transition flex items-center gap-1">
              <span>Ask Gemini</span>
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">24/7 AI Cyber Crime & Banking Advisor</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Instant answers on UPI scams, digital arrest threats, 1930 FIR procedures, and <strong>RBI Zero Liability full refunds</strong>.
            </p>
          </div>
        </div>

        {/* Hub 2: Threat Sandbox Simulator */}
        <div
          onClick={() => setIsSimulatorOpen(true)}
          className="cursor-pointer rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 p-6 space-y-3 hover:border-indigo-500/60 hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Zap className="h-6 w-6" />
            </div>
            <span className="text-xs font-bold text-indigo-400 group-hover:translate-x-1 transition flex items-center gap-1">
              <span>Test Sandbox</span>
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Live Attack Simulator & Shield Tester</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Safely simulate Digital Arrests, Reverse UPI Collects, and Phishing APKs to test PayGuard's real-time interception.
            </p>
          </div>
        </div>

        {/* Hub 3: Emergency Killswitch */}
        <div
          onClick={() => setIsPanicOpen(true)}
          className="cursor-pointer rounded-3xl border border-rose-500/30 bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 p-6 space-y-3 hover:border-rose-500/60 hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Lock className="h-6 w-6" />
            </div>
            <span className="text-xs font-bold text-rose-400 group-hover:translate-x-1 transition flex items-center gap-1">
              <span>Lock Protocol</span>
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Emergency 1-Click Panic Freeze</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Instantly lock all debit/credit cards, disable UPI handles, generate a 1930 police packet, and copy bank SMS freeze codes.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Core Nav Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Check Payment Safety */}
        <div
          onClick={() => onNavigate('scam-checker')}
          className="cursor-pointer rounded-2xl border border-sky-500/30 bg-gradient-to-b from-sky-950/30 to-slate-900 p-5 space-y-3 hover:border-sky-500/60 hover:shadow-lg transition group"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Search className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-sky-400 group-hover:translate-x-1 transition flex items-center gap-1">
              <span>Scan Now</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">AI Scam & Screenshot Scanner</h3>
            <p className="text-xs text-slate-400 mt-1">
              Inspect WhatsApp chats, SMS, QR codes, APKs, and UPI IDs.
            </p>
          </div>
        </div>

        {/* Card 2: My Transactions */}
        <div
          onClick={() => onNavigate('personal-history')}
          className="cursor-pointer rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/30 to-slate-900 p-5 space-y-3 hover:border-emerald-500/60 hover:shadow-lg transition group"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition flex items-center gap-1">
              <span>{transactions.length} Total</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">My Protected Transactions</h3>
            <p className="text-xs text-slate-400 mt-1">
              View payment history and generate official RBI dispute claims.
            </p>
          </div>
        </div>

        {/* Card 3: Lock Bank Cards */}
        <div
          onClick={() => onNavigate('cards-security')}
          className="cursor-pointer rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-950/30 to-slate-900 p-5 space-y-3 hover:border-purple-500/60 hover:shadow-lg transition group"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <CreditCard className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-purple-400 group-hover:translate-x-1 transition flex items-center gap-1">
              <span>{cards.length} Linked</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Card & UPI Controls</h3>
            <p className="text-xs text-slate-400 mt-1">
              Set transaction spending limits and freeze individual cards.
            </p>
          </div>
        </div>

        {/* Card 4: Download My Data */}
        <div
          onClick={() => onNavigate('data-export')}
          className="cursor-pointer rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/30 to-slate-900 p-5 space-y-3 hover:border-amber-500/60 hover:shadow-lg transition group"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Download className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-amber-400 group-hover:translate-x-1 transition flex items-center gap-1">
              <span>CSV & JSON</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Download Statements</h3>
            <p className="text-xs text-slate-400 mt-1">
              Export statements, police dispute reports, and security audit records.
            </p>
          </div>
        </div>
      </div>

      {/* n8n Workflow Banner Showcase */}
      <div
        onClick={() => onNavigate('n8n-workflow')}
        className="cursor-pointer rounded-3xl border border-rose-500/30 bg-gradient-to-r from-rose-950/30 via-slate-900 to-amber-950/30 p-5 sm:p-6 shadow-xl space-y-3 hover:border-rose-500/60 transition group"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/20">
              <GitBranch className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">n8n Real-Time Payment Fraud Workflows</h3>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                  8 Sample Datasets Ready
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Execute live webhook tests with full sample datasets: Ingestion Webhook → Schema Gate → Multiplier Extraction → Fraud Rules → AI Ensemble → Routing.
              </p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-4 py-2 text-xs font-bold text-white group-hover:from-rose-500 group-hover:to-amber-500 transition shadow-lg shadow-rose-600/20">
            <span>Open Test Suite</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
          </button>
        </div>
      </div>

      {/* Critical Alerts Banner if any fraud detected */}
      {fraudTxns.length > 0 && (
        <div className="rounded-3xl border border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {fraudTxns.length} Suspicious Payment Attempts Blocked & Flagged
                </h3>
                <p className="text-xs text-slate-300">
                  Our system protected your bank account from unauthorized transfers.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('personal-history')}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fraudTxns.slice(0, 2).map((txn) => (
              <div
                key={txn.transaction_id}
                className="rounded-2xl border border-rose-500/30 bg-slate-950/80 p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">{txn.merchant_name}</div>
                    <div className="text-xs text-slate-400 font-mono">{txn.transaction_id} • {new Date(txn.timestamp).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-rose-400 font-mono">₹{txn.amount.toLocaleString('en-IN')}</div>
                    <span className="rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold px-1.5 py-0.5">
                      BLOCKED / HELD
                    </span>
                  </div>
                </div>

                <p className="text-xs text-rose-200/90 leading-relaxed">
                  {txn.fraud_signals?.[0] || 'Unauthorized high-velocity device login prevented.'}
                </p>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setSelectedDisputeTxId(txn.transaction_id)}
                    className="flex-1 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 py-2 px-3 text-xs font-bold text-white transition text-center flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Scale className="h-3.5 w-3.5" />
                    <span>Generate RBI Claim</span>
                  </button>

                  <button
                    onClick={() => onNavigate('police-complaints', { transaction: txn })}
                    className="rounded-xl bg-slate-800 hover:bg-slate-700 py-2 px-3 text-xs font-bold text-white transition text-center border border-slate-700"
                  >
                    1930 Police FIR
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions List (Simple & Clean) */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Recent Transactions & Defense Checks</h2>
              <p className="text-xs text-slate-400">All payments are automatically checked for safety</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('personal-history')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            <span>View Full History</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-800/80">
          {transactions.slice(0, 5).map((t) => (
            <div
              key={t.transaction_id}
              onClick={() => onNavigate('personal-history')}
              className="py-3.5 flex items-center justify-between hover:bg-slate-800/30 px-2 rounded-xl cursor-pointer transition"
            >
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                  t.risk_level === 'LOW' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  t.risk_level === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                  'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {t.risk_level === 'LOW' ? '✓' : '!'}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{t.merchant_name}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(t.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} • {t.location || 'Bengaluru'} • {t.transaction_type || 'UPI'}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-bold text-white font-mono">
                  ₹{t.amount.toLocaleString('en-IN')}
                </div>
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  t.risk_level === 'LOW' ? 'text-emerald-400 bg-emerald-500/10' :
                  t.risk_level === 'CRITICAL' ? 'text-rose-400 bg-rose-500/10' :
                  'text-amber-400 bg-amber-500/10'
                }`}>
                  {t.risk_level === 'LOW' ? 'Safe Payment' : t.risk_level === 'CRITICAL' ? 'Scam Flagged' : 'Verification Required'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Embedded Modals */}
      <CyberAdvisorModal
        isOpen={isAdvisorOpen}
        onClose={() => setIsAdvisorOpen(false)}
        onNavigate={onNavigate}
      />

      <EmergencyPanicModal
        isOpen={isPanicOpen}
        onClose={() => {
          setIsPanicOpen(false);
          loadData();
        }}
        onNavigate={onNavigate}
      />

      <ThreatSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />

      {selectedDisputeTxId && (
        <RbiDisputeModal
          isOpen={!!selectedDisputeTxId}
          onClose={() => setSelectedDisputeTxId(null)}
          transactionId={selectedDisputeTxId}
        />
      )}
    </div>
  );
};

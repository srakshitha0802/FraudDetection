import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './services/api.ts';
import {
  Transaction,
  UserProfile,
  DeviceInfo,
  BeneficiaryInfo,
  FraudAlert,
  AgentInvestigationRecord,
  AnalyticsData,
  ModelMetricsData,
  AuditLog,
  AuthUser
} from './types.ts';
import { Navbar } from './components/Navbar.tsx';
import { B2bDashboardView } from './components/views/B2bDashboardView.tsx';
import { B2bIncidentsView } from './components/views/B2bIncidentsView.tsx';
import { B2bTransactionsView } from './components/views/B2bTransactionsView.tsx';
import { B2bRiskAnalyticsView } from './components/views/B2bRiskAnalyticsView.tsx';
import { B2bModelHealthView } from './components/views/B2bModelHealthView.tsx';
import { AuthGateView } from './components/views/AuthGateView.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { InvestigationModal } from './components/InvestigationModal.tsx';
import {
  ShieldCheck,
  Download,
  PhoneCall,
  Lock,
  Search,
  FileText,
  Bot,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { CyberAdvisorModal } from './components/CyberAdvisorModal.tsx';
import { EmergencyPanicModal } from './components/EmergencyPanicModal.tsx';
import { TransactionAnalysisPopModal } from './components/TransactionAnalysisPopModal.tsx';

const DEFAULT_AUTH_USER: AuthUser = {
  id: 'usr-srakshitha-personal',
  name: 'Rakshitha S',
  email: 'srakshitha912@gmail.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  role: 'PERSONAL_USER',
  roleTitle: 'Personal Account Holder',
  clearanceLevel: 'PERSONAL',
  provider: 'google',
  lastLogin: 'Active session (Verified Gmail SSO)',
  isPersonalAccount: true,
  bankName: 'HDFC Bank & ICICI Bank',
  accountNumberMasked: 'HDFC •••• 8831',
  upiHandle: 'srakshitha@okhdfcbank',
  location: 'Bengaluru, Karnataka, India'
};

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [navigationExtra, setNavigationExtra] = useState<any>(null);

  // Auth State with localStorage persistence
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('sentinel_auth_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return DEFAULT_AUTH_USER;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState<string>('srakshitha912@gmail.com');

  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [isResettingDemo, setIsResettingDemo] = useState<boolean>(false);

  // Modal State
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [selectedInvestigation, setSelectedInvestigation] = useState<AgentInvestigationRecord | null>(null);
  const [isInvestigationModalOpen, setIsInvestigationModalOpen] = useState<boolean>(false);
  const [isGlobalAdvisorOpen, setIsGlobalAdvisorOpen] = useState<boolean>(false);
  const [isGlobalPanicOpen, setIsGlobalPanicOpen] = useState<boolean>(false);

  // Initial Data Fetch
  const loadData = async () => {
    try {
      const [txRes, alertRes] = await Promise.allSettled([
        api.getTransactions(),
        api.getFraudAlerts(),
      ]);

      if (txRes.status === 'fulfilled' && Array.isArray(txRes.value)) setTransactions(txRes.value);
      if (alertRes.status === 'fulfilled' && Array.isArray(alertRes.value)) setAlerts(alertRes.value);
    } catch (err) {
      console.warn('Initial data load notice:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('sentinel_auth_user', JSON.stringify(user));
    } catch {
      // ignore
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('sentinel_auth_user');
    } catch {
      // ignore
    }
  };

  const handleOpenAuth = (mode: 'signin' | 'signup', email?: string) => {
    setAuthModalMode(mode);
    if (email) setAuthEmail(email);
    setIsAuthModalOpen(true);
  };

  const handleResetDemo = async () => {
    setIsResettingDemo(true);
    try {
      await api.resetDemo();
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsResettingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alertsCount={alerts.filter(a => a.status === 'OPEN' || a.status === 'UNDER_INVESTIGATION').length}
        onResetDemo={handleResetDemo}
        isResetting={isResettingDemo}
        currentUser={currentUser}
        onOpenAuthModal={handleOpenAuth}
        onSignOut={handleSignOut}
        onSwitchUser={handleLoginSuccess}
        onNavigate={(tab, extra) => {
          setNavigationExtra(extra || null);
          setActiveTab(tab);
        }}
        transactions={transactions}
        alerts={alerts}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {!currentUser ? (
          <AuthGateView
            onLoginSuccess={handleLoginSuccess}
            onOpenAuthModal={handleOpenAuth}
          />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {activeTab === 'overview' && (
                <B2bDashboardView
                  onNavigate={(tab, extra) => {
                    setNavigationExtra(extra || null);
                    setActiveTab(tab);
                  }}
                />
              )}

              {activeTab === 'incidents' && (
                <B2bIncidentsView
                  initialIncidentId={navigationExtra?.incidentId}
                  onClearNavigation={() => setNavigationExtra(null)}
                />
              )}

              {activeTab === 'transactions' && (
                <B2bTransactionsView />
              )}

              {activeTab === 'analytics' && (
                <B2bRiskAnalyticsView />
              )}

              {activeTab === 'model-health' && (
                <B2bModelHealthView />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        initialMode={authModalMode}
        defaultEmail={authEmail}
      />

      {/* Transaction Details & Investigation Modal */}
      <InvestigationModal
        isOpen={isInvestigationModalOpen}
        onClose={() => setIsInvestigationModalOpen(false)}
        transaction={selectedTx}
        investigation={selectedInvestigation}
        onTransactionUpdated={(updatedTx) => {
          setSelectedTx(updatedTx);
          loadData();
        }}
        onTakeAction={() => {
          loadData();
        }}
      />

      {/* Floating 24/7 AI Cyber Advisor Trigger */}
      {currentUser && (
        <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2">
          <button
            onClick={() => setIsGlobalAdvisorOpen(true)}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-500 hover:from-sky-500 hover:to-indigo-500 text-white px-4 py-3 text-xs font-bold shadow-2xl shadow-sky-600/40 border border-sky-400/40 hover:scale-105 transition active:scale-95 group"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span>24/7 AI Cyber Advisor</span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
          </button>
        </div>
      )}

      {/* Global AI Advisor Modal */}
      <CyberAdvisorModal
        isOpen={isGlobalAdvisorOpen}
        onClose={() => setIsGlobalAdvisorOpen(false)}
        onNavigate={(tab, extra) => {
          setNavigationExtra(extra || null);
          setActiveTab(tab);
          setIsGlobalAdvisorOpen(false);
        }}
      />

      {/* Global Emergency Panic Modal */}
      <EmergencyPanicModal
        isOpen={isGlobalPanicOpen}
        onClose={() => {
          setIsGlobalPanicOpen(false);
          loadData();
        }}
        onNavigate={(tab, extra) => {
          setNavigationExtra(extra || null);
          setActiveTab(tab);
          setIsGlobalPanicOpen(false);
        }}
      />

      {/* Global Transaction Analysis Pop Modal with Audio Buzz */}
      <TransactionAnalysisPopModal
        onOpenInvestigation={(inv, tx) => {
          if (inv) setSelectedInvestigation(inv);
          if (tx) setSelectedTx(tx);
          setIsInvestigationModalOpen(true);
        }}
      />

      {/* Clean User Footer with Download Quick Link */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-400 font-medium">Sentinel PayGuard • Personal Payment & UPI Safety</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400 text-xs">
            <button
              onClick={() => setActiveTab('data-export')}
              className="hover:text-emerald-400 font-semibold transition"
            >
              📥 Download My Data
            </button>
            <a href="tel:1930" className="hover:text-rose-400 font-semibold transition">
              🚨 1930 Cyber Helpline
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

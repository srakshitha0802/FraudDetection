import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CreditCard,
  FileText,
  Download,
  Bell,
  User,
  LogOut,
  PhoneCall,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Clock,
  GitBranch,
  X
} from 'lucide-react';
import { AuthUser, Transaction, FraudAlert } from '../types.ts';
import { api } from '../services/api.ts';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openSimulator?: () => void;
  alertsCount: number;
  onResetDemo: () => void;
  isResetting: boolean;
  currentUser: AuthUser | null;
  onOpenAuthModal: (mode: 'signin' | 'signup') => void;
  onSignOut: () => void;
  onSwitchUser: (user: AuthUser) => void;
  onNavigate?: (tab: string, extra?: any) => void;
  onSelectTransaction?: (txId: string) => void;
  transactions?: Transaction[];
  alerts?: FraudAlert[];
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  alertsCount,
  onResetDemo,
  isResetting,
  currentUser,
  onOpenAuthModal,
  onSignOut,
  onSwitchUser,
  onNavigate,
  transactions: propTransactions
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAlertDropdownOpen, setIsAlertDropdownOpen] = useState(false);
  const [highRiskItems, setHighRiskItems] = useState<any[]>([]);

  const menuRef = useRef<HTMLDivElement>(null);
  const alertBellRef = useRef<HTMLDivElement>(null);

  // Fetch High Risk transactions for live notification tracking
  const loadHighRiskData = async () => {
    try {
      const res = await api.getPersonalTransactions();
      if (res && res.transactions) {
        const highRisk = res.transactions.filter(
          (t: any) => t.risk_level === 'CRITICAL' || t.risk_level === 'HIGH' || (t.risk_score && t.risk_score >= 70)
        );
        setHighRiskItems(highRisk);
      }
    } catch {
      if (propTransactions && propTransactions.length > 0) {
        const highRisk = propTransactions.filter(
          t => t.risk_level === 'CRITICAL' || t.risk_level === 'HIGH' || (t.risk_score && t.risk_score >= 70)
        );
        setHighRiskItems(highRisk);
      }
    }
  };

  useEffect(() => {
    loadHighRiskData();
    const interval = setInterval(loadHighRiskData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (alertBellRef.current && !alertBellRef.current.contains(event.target as Node)) {
        setIsAlertDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalHighRiskCount = highRiskItems.length;

  const handleNav = (tab: string, extra?: any) => {
    setIsAlertDropdownOpen(false);
    setIsProfileMenuOpen(false);
    if (onNavigate) {
      onNavigate(tab, extra);
    } else {
      setActiveTab(tab);
    }
  };

  const navTabs = [
    { id: 'overview', label: 'Dashboard', icon: ShieldCheck },
    { id: 'incidents', label: 'Incidents', icon: ShieldAlert },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'analytics', label: 'Risk Analytics', icon: FileText },
    { id: 'model-health', label: 'Model Health', icon: RefreshCw },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        
        {/* Brand Name & Tagline */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNav('overview')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 shadow-lg">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-wider text-white">SENTINEL</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-tight">
              Real-Time Fraud Incident & Abuse Intelligence
            </p>
          </div>
        </div>

        {/* Action Controls & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Download Data Quick Button */}
          <button
            onClick={() => handleNav('data-export')}
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>Download Data</span>
          </button>

          {/* Emergency 1930 Helpline Button */}
          <a
            href="tel:1930"
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 active:scale-95 transition shadow-sm"
          >
            <PhoneCall className="h-3.5 w-3.5 text-rose-400" />
            <span>Helpline 1930</span>
          </a>

          {/* Notification Bell */}
          <div className="relative" ref={alertBellRef}>
            <button
              id="user-notifications-bell"
              type="button"
              onClick={() => setIsAlertDropdownOpen(!isAlertDropdownOpen)}
              aria-label="Threat Notifications"
              className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                isAlertDropdownOpen
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                  : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Bell className={`h-4 w-4 ${totalHighRiskCount > 0 ? 'text-rose-400' : 'text-slate-400'}`} />

              {totalHighRiskCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-mono font-extrabold text-white shadow-md">
                    {totalHighRiskCount}
                  </span>
                </span>
              )}
            </button>

            {/* Alert Dropdown */}
            <AnimatePresence>
              {isAlertDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-800 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-4 z-50 space-y-3"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-rose-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Safety Notifications</h4>
                    </div>
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                      {totalHighRiskCount} Blocked Threats
                    </span>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {highRiskItems.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1.5" />
                        <span>All clear! No suspicious payment attempts detected.</span>
                      </div>
                    ) : (
                      highRiskItems.map((item) => (
                        <div
                          key={item.transaction_id}
                          onClick={() => handleNav('personal-history')}
                          className="p-3 rounded-xl bg-slate-950/80 border border-rose-500/30 hover:border-rose-500 transition cursor-pointer space-y-1.5"
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-bold text-white">{item.merchant_name}</span>
                            <span className="text-xs font-bold font-mono text-rose-400">₹{item.amount?.toLocaleString()}</span>
                          </div>
                          <p className="text-[11px] text-slate-300">
                            Blocked from unrecognized device in {item.location || 'another state'}.
                          </p>
                          <div className="text-[10px] text-emerald-400 font-semibold flex items-center justify-between pt-1">
                            <span>Protected by PayGuard Shield</span>
                            <span>Review &rarr;</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80">
                    <button
                      onClick={async () => {
                        try {
                          await api.sendFraudAlertEmail({
                            id: `TEST-ALERT-${Date.now().toString().slice(-4)}`,
                            amount: 50000,
                            riskScore: 97,
                            riskLevel: 'HIGH',
                            merchant_name: 'Suspicious Crypto Mule Gateway',
                            fraud_signals: ['Device anomaly', 'High velocity spike', 'Unrecognized VPA']
                          }, currentUser?.email || 'srakshitha912@gmail.com');
                          alert(`Resend API Fraud Alert dispatched to ${currentUser?.email || 'srakshitha912@gmail.com'}! Check your inbox.`);
                        } catch (err: any) {
                          alert(`Resend Email Error: ${err.message}`);
                        }
                      }}
                      className="w-full py-1.5 px-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                      <span>⚡ Test Resend Fraud Alert Email</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 py-1.5 pl-2 pr-3 text-xs font-medium text-slate-200 hover:border-slate-700 hover:bg-slate-800 transition"
            >
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="h-6 w-6 rounded-lg object-cover ring-1 ring-emerald-500/40"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                  {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
                </div>
              )}
              <span className="max-w-[100px] truncate text-xs font-bold text-white">
                {currentUser?.name || 'Account'}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-3 z-50 space-y-2"
                >
                  <div className="p-2 border-b border-slate-800">
                    <p className="text-xs font-bold text-white">{currentUser?.name || 'Rakshitha S'}</p>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser?.email || 'srakshitha912@gmail.com'}</p>
                    <p className="text-[10px] text-emerald-400 font-mono mt-1">HDFC & ICICI UPI Linked</p>
                  </div>

                  <button
                    onClick={() => handleNav('data-export')}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
                  >
                    <Download className="h-4 w-4 text-emerald-400" />
                    <span>Download All My Data</span>
                  </button>

                  <button
                    onClick={() => handleNav('cards-security')}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
                  >
                    <Lock className="h-4 w-4 text-purple-400" />
                    <span>Card & Limit Controls</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition border-t border-slate-800/80 mt-1"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* Main Tab Navigation Bar (Clean & Simple 5 User Tabs) */}
      <div className="border-t border-slate-800/60 bg-slate-950/70 overflow-x-auto no-scrollbar">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 py-1.5 sm:px-6">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleNav(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

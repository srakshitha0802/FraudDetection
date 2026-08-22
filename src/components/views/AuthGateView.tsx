import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  Sparkles,
  Bot,
  Layers,
  Activity,
  CheckCircle2,
  Mail,
  Fingerprint,
  Cpu,
  Globe,
  Radio,
  FileText,
  Inbox
} from 'lucide-react';
import { AuthUser } from '../../types.ts';

interface AuthGateViewProps {
  onLoginSuccess: (user: AuthUser) => void;
  onOpenAuthModal: (mode: 'signin' | 'signup', email?: string) => void;
}

export const AuthGateView: React.FC<AuthGateViewProps> = ({
  onLoginSuccess,
  onOpenAuthModal
}) => {
  const [emailInput, setEmailInput] = useState('srakshitha912@gmail.com');

  const handleSendGmailCode = () => {
    onOpenAuthModal('signin', emailInput || 'srakshitha912@gmail.com');
  };

  const handleInstantDemoLogin = () => {
    const authUser: AuthUser = {
      id: 'usr-srakshitha-personal',
      name: 'Rakshitha S',
      email: emailInput || 'srakshitha912@gmail.com',
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
    onLoginSuccess(authUser);
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-10 px-4 relative overflow-hidden">
      {/* Background Animated Gradient Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10"
      >
        {/* Left Column: Personal Cyber Defense Branding & 4-Step Guide */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>CITIZEN PERSONAL BANKING CYBER SHIELD</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Personal Bank Account <span className="bg-gradient-to-r from-rose-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">Cyber Protection</span> & Fraud Command
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Protect your bank accounts, debit & credit cards from unauthorized debits, mule UPI drains, and phishing scams.
            </p>
          </div>

          {/* 4 Core Steps Tracker */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <Mail className="h-4 w-4" />
                <span>1. Sign In via Gmail</span>
              </div>
              <p className="text-[11px] text-slate-400">Secure OTP / magic link verification to your email.</p>
            </div>

            <div className="rounded-xl border border-rose-500/30 bg-slate-900/80 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                <ShieldAlert className="h-4 w-4" />
                <span>2. Check Fraud History</span>
              </div>
              <p className="text-[11px] text-slate-400">Scan recent debits for unauthorized mule VPAs & clones.</p>
            </div>

            <div className="rounded-xl border border-blue-500/30 bg-slate-900/80 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
                <FileText className="h-4 w-4" />
                <span>3. File Police FIR (1930)</span>
              </div>
              <p className="text-[11px] text-slate-400">Direct report to nearest Cyber Police & National Portal.</p>
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-slate-900/80 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
                <Lock className="h-4 w-4" />
                <span>4. Block Linked Cards</span>
              </div>
              <p className="text-[11px] text-slate-400">1-Click instant emergency card lock & UPI freeze.</p>
            </div>
          </div>
        </div>

        {/* Right Column: High-Impact Sign-In Card */}
        <div className="lg:col-span-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <ShieldAlert className="h-28 w-28 text-rose-400" />
            </div>

            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400">
                  Step 1: Sign-In
                </span>
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  SHIELD ACTIVE
                </span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Personal Banking Login</h3>
              <p className="text-xs text-slate-400">Dispatch sign-in message to your Gmail address</p>
            </div>

            {/* Google / Gmail Direct Action */}
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1.5">
                <label className="block text-[11px] font-medium text-slate-400">Your Gmail Address</label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-rose-400 shrink-0" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="srakshitha912@gmail.com"
                    className="w-full bg-transparent text-xs text-white placeholder-slate-600 focus:outline-none font-mono font-semibold"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendGmailCode}
                className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-750 px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:border-slate-600 active:scale-[0.98] group"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.39 7.37 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12c0 2.02.46 3.84 1.26 5.42l4.02-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.61 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Send Sign-In Message to Gmail</span>
              </button>
            </div>

            {/* Alternative Auth Triggers */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => onOpenAuthModal('signin')}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 py-2.5 text-xs font-bold text-white shadow-md hover:from-rose-500 hover:to-orange-400 active:scale-[0.99] transition"
              >
                <span>Sign In with OTP Passcode</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Demo Entry */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleInstantDemoLogin}
                className="text-[11px] text-slate-400 hover:text-rose-400 transition font-mono flex items-center justify-center gap-1 mx-auto"
              >
                <span>⚡ Instant Verified Personal Account Entry (Rakshitha S)</span>
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

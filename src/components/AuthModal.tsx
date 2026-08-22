import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Key,
  ShieldCheck,
  User,
  Zap,
  Fingerprint,
  Inbox,
  Clock,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AuthUser } from '../types.ts';
import { api } from '../services/api.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser) => void;
  initialMode?: 'signin' | 'signup';
  defaultEmail?: string;
}

const PRESET_ACCOUNTS: AuthUser[] = [
  {
    id: 'usr-sentinel-lead',
    name: 'Rakshitha S',
    email: 'srakshitha912@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    role: 'LEAD_INVESTIGATOR',
    roleTitle: 'Principal Fraud Intelligence Lead',
    clearanceLevel: 'LEVEL_3_ADMIN',
    provider: 'google',
    lastLogin: 'Active session (Just now)'
  },
  {
    id: 'usr-aml-officer',
    name: 'Vikram Mehta',
    email: 'vikram.mehta@fiusentinel.gov.in',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    role: 'COMPLIANCE_OFFICER',
    roleTitle: 'AML / FIU Compliance Officer',
    clearanceLevel: 'LEVEL_2_SENIOR',
    provider: 'email',
    lastLogin: 'Today, 08:30 IST'
  },
  {
    id: 'usr-risk-engineer',
    name: 'Dr. Ananya Roy',
    email: 'ananya.roy@sentinel-ai.internal',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    role: 'RISK_ENGINEER',
    roleTitle: 'Chief ML Risk Architect',
    clearanceLevel: 'LEVEL_3_ADMIN',
    provider: 'google',
    lastLogin: 'Yesterday, 22:15 IST'
  }
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'signin',
  defaultEmail = 'srakshitha912@gmail.com'
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'otp_verify'>(initialMode);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'LEAD_INVESTIGATOR' | 'COMPLIANCE_OFFICER' | 'RISK_ENGINEER' | 'FRAUD_ANALYST'>('LEAD_INVESTIGATOR');
  
  // OTP Verification State
  const [otpCode, setOtpCode] = useState('');
  const [magicToken, setMagicToken] = useState('');
  const [dispatchedEmailPreview, setDispatchedEmailPreview] = useState<{
    subject: string;
    text: string;
    html: string;
    timestamp: string;
    code: string;
  } | null>(null);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [countdown, setCountdown] = useState(600); // 10 minutes

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timer for OTP expiration
  useEffect(() => {
    let timer: any;
    if (mode === 'otp_verify' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode, countdown]);

  if (!isOpen) return null;

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // Step 1: Dispatch Verification Message to Gmail
  const handleSendGmailCode = async (targetEmail?: string) => {
    const chosenEmail = (targetEmail || email || 'srakshitha912@gmail.com').trim().toLowerCase();
    if (!chosenEmail || !chosenEmail.includes('@')) {
      setErrorMessage('Please enter a valid Gmail or work email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage('Connecting to Sentinel Security Mail Server...');

    try {
      const res = await api.sendSignInCode(chosenEmail);
      setEmail(chosenEmail);
      setMagicToken(res.magicToken);
      setDispatchedEmailPreview({
        subject: res.preview.subject,
        text: res.preview.text,
        html: res.preview.html,
        timestamp: res.preview.timestamp,
        code: res.code,
      });
      setOtpCode(res.code); // pre-populate for high usability
      setCountdown(600);
      setMode('otp_verify');
      setStatusMessage(`Sign-in verification message dispatched to ${chosenEmail}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch verification email');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP Code
  const handleVerifyOtp = async (overrideCode?: string) => {
    const codeToVerify = (overrideCode || otpCode).trim();
    if (!codeToVerify && !magicToken) {
      setErrorMessage('Please enter the 6-digit verification code sent to your Gmail.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage('Validating 6-digit security code...');

    try {
      const res = await api.verifySignInCode({
        email,
        code: codeToVerify,
        magicToken: !codeToVerify ? magicToken : undefined,
      });

      if (res.user) {
        setStatusMessage('Authentication verified. Launching SOC console...');
        setTimeout(() => {
          onLoginSuccess(res.user);
          setIsLoading(false);
          onClose();
        }, 500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired verification code');
      setIsLoading(false);
    }
  };

  // Step 3: Handle direct password submission
  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid corporate or personal email address.');
      return;
    }

    // Send code to Gmail automatically
    await handleSendGmailCode(email);
  };

  // Preset Fast Sign-In
  const handleSelectPreset = (preset: AuthUser) => {
    setIsLoading(true);
    setStatusMessage(`Authorizing ${preset.name} with Level-3 Clearance...`);
    setTimeout(() => {
      onLoginSuccess(preset);
      setIsLoading(false);
      onClose();
    }, 600);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 p-6 sm:p-7 shadow-2xl shadow-rose-950/20 text-slate-100 z-10 max-h-[90vh] overflow-y-auto"
        >
          {/* Subtle Top Glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-cyan-500" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  Sentinel SOC Access Portal
                  <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono">
                    256-BIT TLS
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  {mode === 'otp_verify' ? 'Verify the one-time code sent to your Gmail' : 'Authenticate analyst credentials & security clearance'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              ✕
            </button>
          </div>

          {/* Status / Error Notifications */}
          {errorMessage && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && !errorMessage && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE: OTP VERIFICATION (GMAIL MESSAGE SENT) */}
          {/* ========================================================================= */}
          {mode === 'otp_verify' ? (
            <div className="mt-5 space-y-5">
              {/* Target Notice */}
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block leading-none">Verification Code Sent To:</span>
                    <span className="text-xs font-bold text-white font-mono">{email}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-xs text-rose-400 hover:underline font-semibold"
                >
                  Change Email
                </button>
              </div>

              {/* 6-Digit Code Input Section */}
              <div className="space-y-3 text-center">
                <label className="block text-xs font-semibold text-slate-300">
                  Enter 6-Digit One-Time Passcode
                </label>

                <div className="flex items-center justify-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="849201"
                    className="w-48 text-center tracking-[8px] font-mono text-2xl font-extrabold rounded-xl border border-rose-500/50 bg-slate-950 py-3 text-white focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                  />
                </div>

                <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    Expires in: <strong className="text-amber-400">{formatTime(countdown)}</strong>
                  </span>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => handleSendGmailCode(email)}
                    disabled={isLoading}
                    className="text-rose-400 hover:underline font-medium flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                    Resend Email
                  </button>
                </div>
              </div>

              {/* Verify Button */}
              <button
                type="button"
                onClick={() => handleVerifyOtp()}
                disabled={isLoading || otpCode.length < 6}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/25 hover:from-rose-500 hover:to-orange-400 active:scale-[0.99] disabled:opacity-50 transition"
              >
                {isLoading ? (
                  <Fingerprint className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>Verify Code & Enter SOC</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Dispatched Gmail Message Preview Card */}
              {dispatchedEmailPreview && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden">
                  <div
                    onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                    className="flex items-center justify-between p-3 bg-slate-900/60 cursor-pointer hover:bg-slate-900 transition"
                  >
                    <div className="flex items-center gap-2">
                      <Inbox className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-white">
                        📧 Dispatched Gmail Message (Live Delivery)
                      </span>
                      <span className="rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-1.5 py-0.5 border border-emerald-500/30">
                        DELIVERED
                      </span>
                    </div>
                    {isPreviewExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>

                  {isPreviewExpanded && (
                    <div className="p-3.5 space-y-3 font-mono text-xs border-t border-slate-800">
                      <div className="space-y-1 text-slate-400 text-[11px]">
                        <div><span className="text-slate-500">From:</span> Fraud Sentinel AI &lt;security-alerts@sentinel-soc.internal&gt;</div>
                        <div><span className="text-slate-500">To:</span> {email}</div>
                        <div><span className="text-slate-500">Subject:</span> <strong className="text-white font-sans">{dispatchedEmailPreview.subject}</strong></div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-sans space-y-2">
                        <p className="text-slate-300 text-xs">
                          Your One-Time Security Passcode to access Fraud Sentinel SOC is:
                        </p>
                        <div className="flex items-center justify-between rounded-lg bg-slate-950 p-2 border border-slate-800 font-mono">
                          <span className="text-lg font-bold text-rose-400 tracking-widest">{dispatchedEmailPreview.code}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(dispatchedEmailPreview.code)}
                            className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 px-2 py-1 rounded"
                          >
                            <Copy className="h-3 w-3" />
                            <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Security Clearance: LEVEL_3_ADMIN • Valid for 10 minutes
                        </p>
                      </div>

                      {/* 1-Click Magic Link Direct Auth */}
                      <button
                        type="button"
                        onClick={() => handleVerifyOtp(dispatchedEmailPreview.code)}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 py-2 text-xs font-semibold text-cyan-300 border border-cyan-500/30 transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Instant 1-Click Magic Sign-In via Gmail Link</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ========================================================================= */
            /* MODE: SIGN IN / SIGN UP / GMAIL INGESTION */
            /* ========================================================================= */
            <div className="mt-5 space-y-5">
              {/* Primary Google / Gmail Direct Action */}
              <div>
                <button
                  type="button"
                  onClick={() => handleSendGmailCode(email || 'srakshitha912@gmail.com')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:border-slate-600 active:scale-[0.99] group"
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
                  <span className="text-[11px] rounded bg-rose-500/20 text-rose-300 px-1.5 py-0.5 border border-rose-500/30 ml-auto hidden sm:inline font-mono">
                    srakshitha912@gmail.com
                  </span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-slate-800" />
                <span className="bg-slate-900 px-3 text-xs uppercase tracking-wider text-slate-500 font-mono">
                  Or Email Dispatch
                </span>
              </div>

              {/* Mode Tabs */}
              <div className="grid grid-cols-2 rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setErrorMessage(null); }}
                  className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                    mode === 'signin'
                      ? 'bg-slate-800 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sign In with Email OTP
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setErrorMessage(null); }}
                  className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                    mode === 'signup'
                      ? 'bg-slate-800 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Register New Analyst
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handlePasswordAuth} className="space-y-3.5">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Full Name & Title</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. S Rakshitha (Lead Officer)"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Corporate or Gmail Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="srakshitha912@gmail.com"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Security Role / Clearance</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white focus:border-rose-500 focus:outline-none"
                    >
                      <option value="LEAD_INVESTIGATOR">Lead Fraud Investigator (Admin / SAR Filing)</option>
                      <option value="COMPLIANCE_OFFICER">AML / Regulatory Compliance Officer</option>
                      <option value="RISK_ENGINEER">Risk Model & Rules Engineer</option>
                      <option value="FRAUD_ANALYST">Fraud Analyst / Triage Operator</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/25 hover:from-rose-500 hover:to-orange-400 active:scale-[0.99] transition mt-2"
                >
                  <span>Dispatch Security Sign-In Code</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              {/* Fast Persona Switcher / Quick Sign-In */}
              <div className="pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                    Instant Demo Personas
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">1-Click Auth</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {PRESET_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleSelectPreset(acc)}
                      className="flex flex-col items-start p-2 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800 hover:border-slate-700 transition text-left"
                    >
                      <div className="flex items-center gap-2 w-full">
                        {acc.avatar ? (
                          <img src={acc.avatar} alt={acc.name} className="h-5 w-5 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                            {acc.name[0]}
                          </div>
                        )}
                        <span className="text-xs font-semibold text-white truncate">{acc.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 truncate w-full mt-1">{acc.roleTitle}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

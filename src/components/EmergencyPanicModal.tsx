import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  AlertTriangle,
  Lock,
  PhoneCall,
  Check,
  Copy,
  FileText,
  X,
  RefreshCw,
  ExternalLink,
  Smartphone,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { api } from '../services/api.ts';

interface EmergencyPanicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string, extra?: any) => void;
}

export const EmergencyPanicModal: React.FC<EmergencyPanicModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [panicResult, setPanicResult] = useState<any>(null);
  const [copiedSmsIndex, setCopiedSmsIndex] = useState<number | null>(null);

  const handleTriggerPanic = async () => {
    setIsExecuting(true);
    try {
      const res = await api.triggerEmergencyPanicFreeze('User initiated Emergency Panic Killswitch');
      setPanicResult(res);
    } catch (err: any) {
      alert('Emergency freeze error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedSmsIndex(index);
    setTimeout(() => setCopiedSmsIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-rose-500/50 bg-slate-950 shadow-[0_0_50px_rgba(239,68,68,0.3)] text-slate-100 p-6 sm:p-8"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        {!panicResult ? (
          <div className="space-y-6">
            {/* Warning Header */}
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 shrink-0 animate-pulse">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Emergency Panic Lockdown Protocol
                </h2>
                <p className="text-xs text-rose-300 font-semibold mt-1">
                  Active Financial Threat or Compromised Account Killswitch
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-rose-950/30 border border-rose-500/30 p-4 text-xs text-slate-300 space-y-2">
              <p className="font-bold text-rose-200 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-400" /> What this action does in 1 Click:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                <li><strong>Instantly Locks All Linked Bank Cards</strong> (Credit & Debit cards blocked for Online, ATM, and Intl transactions).</li>
                <li><strong>Deactivates UPI Auto-Pay & Debit Mandates</strong> across all accounts.</li>
                <li><strong>Generates an Emergency 1930 Cyber Cell Dispatch Packet</strong> with device fingerprints & timestamps.</li>
                <li><strong>Provides instant one-tap SMS emergency blocking codes</strong> for HDFC, ICICI, SBI, and Axis Bank.</li>
              </ul>
            </div>

            {/* Confirmation CTA */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleTriggerPanic}
                disabled={isExecuting}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-600 text-white font-bold py-4 text-sm shadow-xl shadow-rose-600/30 transition disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Freezing All Cards & Mandates...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5" />
                    <span>EXECUTE EMERGENCY LOCKDOWN NOW</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="rounded-2xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold px-6 py-4 text-xs transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Success Shield */}
            <div className="flex items-center gap-4 border-b border-rose-500/30 pb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 shrink-0">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">
                  All Payment Channels Successfully LOCKED
                </h3>
                <p className="text-xs text-rose-300 mt-0.5">
                  Emergency Reference: <span className="font-mono font-bold text-white">{panicResult.emergencyAckNumber}</span>
                </p>
              </div>
            </div>

            {/* Emergency Status Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Cards Locked</p>
                <p className="text-lg font-black text-rose-400 mt-1">{panicResult.cardsLockedCount} Linked Cards</p>
              </div>
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Account Debit Status</p>
                <p className="text-lg font-black text-emerald-400 mt-1">FROZEN (0 Debit)</p>
              </div>
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-center col-span-2 sm:col-span-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold">1930 Packet</p>
                <p className="text-xs font-mono font-bold text-sky-400 mt-2">{panicResult.emergencyPacketId}</p>
              </div>
            </div>

            {/* Bank Emergency SMS Blocking Commands */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-emerald-400" />
                  Instant Bank SMS Emergency Block Codes
                </h4>
                <span className="text-[10px] text-slate-400">Send from your registered mobile number</span>
              </div>

              <div className="space-y-2">
                {panicResult.bankSmsCommands?.map((cmd: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900 border border-slate-800 p-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{cmd.bank}</span>
                        <span className="text-[10px] font-mono text-slate-400">To: {cmd.number}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{cmd.description}</p>
                    </div>

                    <button
                      onClick={() => handleCopy(cmd.smsBody, idx)}
                      className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 font-mono font-bold text-xs border border-slate-700 transition shrink-0"
                    >
                      {copiedSmsIndex === idx ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-400" />
                          <span>"{cmd.smsBody}"</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Direct Dial Helplines */}
            <div className="rounded-2xl bg-rose-950/20 border border-rose-500/20 p-4 space-y-2">
              <h4 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <PhoneCall className="h-4 w-4 text-rose-400" /> Direct 24/7 Toll-Free Emergency Hotlines
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {panicResult.hotlines?.map((h: any, i: number) => (
                  <a
                    key={i}
                    href={`tel:${h.phone.replace(/[^0-9]/g, '')}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 transition"
                  >
                    <div>
                      <p className="font-bold text-white">{h.name}</p>
                      <p className="text-[10px] text-slate-400">{h.speed}</p>
                    </div>
                    <span className="font-mono font-black text-rose-400 text-sm">{h.phone}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Navigation CTA */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={() => {
                  onClose();
                  onNavigate?.('police-complaints');
                }}
                className="flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-4 py-2.5 transition"
              >
                <FileText className="h-4 w-4" />
                <span>View Filed 1930 FIR & Police Case</span>
              </button>

              <button
                onClick={onClose}
                className="rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-4 py-2.5 transition"
              >
                Close Window
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

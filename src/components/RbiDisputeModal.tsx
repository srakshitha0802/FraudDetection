import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Scale,
  FileText,
  Copy,
  Check,
  Download,
  Printer,
  X,
  Building,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api.ts';

interface RbiDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
}

export const RbiDisputeModal: React.FC<RbiDisputeModalProps> = ({
  isOpen,
  onClose,
  transactionId
}) => {
  const [packet, setPacket] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && transactionId) {
      setIsLoading(true);
      api.getRbiDisputePacket(transactionId)
        .then(data => setPacket(data))
        .catch(err => console.error('RBI packet load error:', err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, transactionId]);

  const handleCopyLetter = () => {
    if (!packet?.formal_legal_letter_text) return;
    navigator.clipboard.writeText(packet.formal_legal_letter_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTxt = () => {
    if (!packet?.formal_legal_letter_text) return;
    const blob = new Blob([packet.formal_legal_letter_text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RBI_Zero_Liability_Claim_${transactionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-sky-500/30 bg-slate-900 shadow-2xl p-6 sm:p-8 text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/20 border border-sky-500/40 text-sky-400">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">
                  Official RBI Zero Liability Dispute Notice
                </h3>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                  Statutory Protection
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generated under RBI Circular DBR.No.Leg.BC.78/09.07.005/2017-18
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin"></div>
            <span>Assembling statutory banking dispute packet...</span>
          </div>
        ) : packet ? (
          <div className="space-y-6 mt-6">
            {/* Statutory Window Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/30 p-4">
                <p className="text-[10px] uppercase font-bold text-emerald-400">Liability Determination</p>
                <p className="text-sm font-bold text-white mt-1">{packet.liability_determination?.liability_tier}</p>
                <p className="text-[11px] text-emerald-300 mt-0.5 font-medium">Customer Obligation: {packet.liability_determination?.customer_liability_amount}</p>
              </div>

              <div className="rounded-2xl bg-sky-950/30 border border-sky-500/30 p-4">
                <p className="text-[10px] uppercase font-bold text-sky-400">Bank Resolution Mandate</p>
                <p className="text-sm font-bold text-white mt-1">{packet.liability_determination?.statutory_resolution_deadline}</p>
                <p className="text-[11px] text-sky-300 mt-0.5 font-medium">Mandatory full shadow reversal</p>
              </div>

              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
                <p className="text-[10px] uppercase font-bold text-slate-400">Claim Identifier</p>
                <p className="text-xs font-mono font-bold text-white mt-1">{packet.claim_id}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Transaction: {transactionId}</p>
              </div>
            </div>

            {/* Generated Formal Letter Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-sky-400" />
                  Official Formal Letter to Bank Principal Nodal Officer
                </label>
                <span className="text-[10px] text-slate-400">Ready to submit via Email / In-Person</span>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 font-mono text-xs text-slate-300 leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap selection:bg-sky-500 selection:text-white">
                {packet.formal_legal_letter_text}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLetter}
                  className="flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-4 py-2.5 transition shadow-sm"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Letter Copied to Clipboard' : 'Copy Formal Notice'}</span>
                </button>

                <button
                  onClick={handleDownloadTxt}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 border border-slate-700 transition"
                >
                  <Download className="h-4 w-4 text-emerald-400" />
                  <span>Download .txt</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 border border-slate-700 transition hidden sm:flex"
                >
                  <Printer className="h-4 w-4 text-sky-400" />
                  <span>Print Document</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-4 py-2.5 transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
};

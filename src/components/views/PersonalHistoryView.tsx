import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  FileText,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  MapPin,
  Clock,
  CreditCard,
  Zap,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
  PhoneCall,
  Download,
  FileSpreadsheet,
  Scale
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { RbiDisputeModal } from '../RbiDisputeModal.tsx';

interface PersonalHistoryViewProps {
  onFileComplaint: (transaction?: any) => void;
  onBlockCard: (cardLast4?: string) => void;
}

export const PersonalHistoryView: React.FC<PersonalHistoryViewProps> = ({
  onFileComplaint,
  onBlockCard
}) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'FRAUD_DETECTED' | 'BLOCKED' | 'SAFE'>('ALL');
  const [selectedTxn, setSelectedTxn] = useState<any | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [selectedDisputeTxId, setSelectedDisputeTxId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await api.getPersonalTransactions();
      setTransactions(res.transactions || []);
      setSummary(res.summary || null);
      if (res.transactions && res.transactions.length > 0 && !selectedTxn) {
        const fraudTxn = res.transactions.find((t: any) => t.risk_level === 'CRITICAL') || res.transactions[0];
        setSelectedTxn(fraudTxn);
      }
    } catch (err) {
      console.error('Failed to load transaction history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.merchant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.device_model?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'FRAUD_DETECTED') {
      return t.risk_level === 'CRITICAL' || t.risk_level === 'HIGH';
    }
    if (filterType === 'BLOCKED') {
      return t.status === 'BLOCKED' || t.card_blocked;
    }
    if (filterType === 'SAFE') {
      return t.risk_level === 'LOW';
    }
    return true;
  });

  const fraudCount = transactions.filter(t => t.risk_level === 'CRITICAL' || t.risk_level === 'HIGH').length;

  // Download CSV
  const handleDownloadCSV = () => {
    try {
      const headers = [
        'Transaction ID',
        'Date & Time',
        'Payee / Merchant',
        'Amount (INR)',
        'Payment Method',
        'Safety Status',
        'Risk Level',
        'Risk Score (0-100)',
        'Device Used',
        'Location / City'
      ];

      const rows = transactions.map(t => [
        `"${t.transaction_id}"`,
        `"${new Date(t.timestamp).toLocaleString('en-IN')}"`,
        `"${(t.merchant_name || 'Transfer').replace(/"/g, '""')}"`,
        t.amount,
        `"${t.transaction_type || 'UPI'}"`,
        `"${t.status}"`,
        `"${t.risk_level || 'LOW'}"`,
        t.risk_score || 0,
        `"${(t.device_model || t.device_id || 'Primary Phone').replace(/"/g, '""')}"`,
        `"${(t.location || 'Bengaluru, India').replace(/"/g, '""')}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Sentinel_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadSuccess('CSV Transaction statement downloaded!');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err) {
      console.error('CSV export failed:', err);
    }
  };

  // Download Single Receipt
  const handleDownloadReceipt = (txn: any) => {
    try {
      const receiptText = `=========================================
SENTINEL PAYGUARD - TRANSACTION RECEIPT
=========================================
Transaction ID: ${txn.transaction_id}
Date & Time: ${new Date(txn.timestamp).toLocaleString('en-IN')}
Amount: INR ₹${txn.amount.toLocaleString('en-IN')}
Beneficiary: ${txn.merchant_name}
Payment Channel: ${txn.transaction_type}
Status: ${txn.status}
Safety Rating: ${txn.risk_level === 'LOW' ? 'SAFE' : 'SUSPICIOUS / HELD'}
Device: ${txn.device_model || txn.device_id}
Location: ${txn.location}
=========================================
Verified by Sentinel Personal PayGuard
=========================================`;

      const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Receipt_${txn.transaction_id}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Receipt download error:', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 p-6 sm:p-8 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-0.5 border border-emerald-500/30">
                PERSONAL TRANSACTION LEDGER
              </span>
              <span className="text-xs text-slate-400">• Real-Time Protection</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              My Transactions & Safety Alerts
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Every payment is analyzed in real-time. Unauthorized attempts are held to protect your money.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span>Download Statement (.CSV)</span>
          </button>

          <button
            onClick={fetchHistory}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white transition"
            title="Refresh Transactions"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-500/40 bg-emerald-950/50 p-4 text-xs font-bold text-emerald-300 flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{downloadSuccess}</span>
        </motion.div>
      )}

      {/* Main Grid: Left List + Right Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Transaction Feed with Filters (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by merchant, UPI ID, amount, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  filterType === 'ALL' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({transactions.length})
              </button>
              <button
                onClick={() => setFilterType('FRAUD_DETECTED')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
                  filterType === 'FRAUD_DETECTED' ? 'bg-rose-500 text-white font-bold' : 'text-rose-400 hover:bg-rose-500/10'
                }`}
              >
                <span>Flagged ({fraudCount})</span>
              </button>
              <button
                onClick={() => setFilterType('SAFE')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  filterType === 'SAFE' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Safe
              </button>
            </div>
          </div>

          {/* Transactions List */}
          <div className="space-y-2.5">
            {filteredTransactions.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400 text-xs">
                No transactions found matching your search query.
              </div>
            ) : (
              filteredTransactions.map((txn) => {
                const isFraud = txn.risk_level === 'CRITICAL' || txn.risk_level === 'HIGH';
                const isSelected = selectedTxn?.transaction_id === txn.transaction_id;

                return (
                  <motion.div
                    key={txn.transaction_id}
                    onClick={() => setSelectedTxn(txn)}
                    whileHover={{ scale: 1.005 }}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      isSelected
                        ? 'border-emerald-500 bg-slate-900 shadow-md ring-1 ring-emerald-500/40'
                        : isFraud
                        ? 'border-rose-500/40 bg-rose-950/10 hover:border-rose-500/60'
                        : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 font-bold ${
                            isFraud
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {isFraud ? <AlertTriangle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white tracking-tight">{txn.merchant_name}</h4>
                            {isFraud ? (
                              <span className="rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 border border-rose-500/40">
                                🛑 SCAM BLOCKED
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 border border-emerald-500/20">
                                ✅ SAFE
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                            <span className="font-mono">{txn.transaction_id}</span>
                            <span>•</span>
                            <span>{new Date(txn.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {txn.location}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount */}
                      <div className="text-right shrink-0">
                        <div className={`text-base font-black font-mono ${isFraud ? 'text-rose-400' : 'text-slate-100'}`}>
                          - ₹{txn.amount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {txn.transaction_type || 'UPI'}
                        </div>
                      </div>
                    </div>

                    {/* Fraud Notice Banner */}
                    {isFraud && txn.fraud_signals && txn.fraud_signals.length > 0 && (
                      <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-950/40 p-2.5 text-xs text-rose-300 flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                          <span className="truncate">{txn.fraud_signals[0]}</span>
                        </div>
                        <span className="text-rose-400 font-semibold shrink-0 ml-2">
                          View Details &rarr;
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Transaction Safety Explanation (5 cols) */}
        <div className="lg:col-span-5">
          {selectedTxn ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-5 sticky top-20">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold font-mono uppercase ${
                        selectedTxn.risk_level === 'CRITICAL' || selectedTxn.risk_level === 'HIGH'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {selectedTxn.risk_level === 'CRITICAL' || selectedTxn.risk_level === 'HIGH' ? 'BLOCKED SCAM' : 'VERIFIED SAFE'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{selectedTxn.transaction_id}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1.5">{selectedTxn.merchant_name}</h3>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black text-rose-400 font-mono">
                    ₹{selectedTxn.amount.toLocaleString('en-IN')}
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{selectedTxn.transaction_type}</span>
                </div>
              </div>

              {/* Plain English "What Happened?" Box */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-sky-400" />
                  <span>Security Analysis</span>
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {selectedTxn.risk_level === 'CRITICAL' || selectedTxn.risk_level === 'HIGH'
                    ? '⚠️ This payment was blocked because it was attempted from an unrecognized phone/emulator in a different city while your device was in Bengaluru. No money was lost.'
                    : '✅ This payment was verified as safe. The merchant is recognized and the transaction was made from your primary phone in Bengaluru.'}
                </p>
              </div>

              {/* Transaction Details Grid */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/60">
                  <span className="text-slate-400">Device Used:</span>
                  <span className="font-semibold text-white font-mono">{selectedTxn.device_model || selectedTxn.device_id}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/60">
                  <span className="text-slate-400">Location:</span>
                  <span className="font-semibold text-white">{selectedTxn.location}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/60">
                  <span className="text-slate-400">Payment Status:</span>
                  <span className="font-bold text-amber-400 font-mono">{selectedTxn.status}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                {(selectedTxn.risk_level === 'CRITICAL' || selectedTxn.risk_level === 'HIGH') ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedDisputeTxId(selectedTxn.transaction_id)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 py-2.5 px-3 text-xs font-bold text-white transition text-center shadow-md shadow-sky-600/20"
                    >
                      <Scale className="h-4 w-4" />
                      <span>Generate RBI Zero Liability Claim</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onFileComplaint(selectedTxn)}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 py-2.5 px-3 text-xs font-bold text-white transition text-center shadow-lg shadow-rose-600/20"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Report Scam (1930)</span>
                      </button>
                      <button
                        onClick={() => onBlockCard(selectedTxn.card_last4 || '4829')}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/50 bg-slate-900 py-2.5 px-3 text-xs font-bold text-rose-300 hover:bg-rose-500/10 transition text-center"
                      >
                        <Lock className="h-4 w-4" />
                        <span>Lock Card</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDownloadReceipt(selectedTxn)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 py-3 px-4 text-xs font-bold text-slate-200 transition"
                  >
                    <Download className="h-4 w-4 text-emerald-400" />
                    <span>Download Receipt (.TXT)</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400 text-xs">
              Select any transaction to view details.
            </div>
          )}
        </div>
      </div>

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

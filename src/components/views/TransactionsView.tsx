import React, { useState } from 'react';
import { Transaction } from '../../types.ts';
import {
  Search,
  Filter,
  ShieldAlert,
  CheckCircle2,
  Lock,
  AlertTriangle,
  ArrowUpRight,
  Smartphone,
  MapPin,
  Clock,
  Sparkles
} from 'lucide-react';

interface TransactionsViewProps {
  transactions: Transaction[];
  onSelectTransaction: (txId: string) => void;
  onOpenSimulator: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onSelectTransaction,
  onOpenSimulator,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

  const filtered = transactions.filter(tx => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      tx.transaction_id.toLowerCase().includes(term) ||
      (tx.user_name || '').toLowerCase().includes(term) ||
      tx.user_id.toLowerCase().includes(term) ||
      (tx.device_id || '').toLowerCase().includes(term) ||
      (tx.location || '').toLowerCase().includes(term) ||
      (tx.beneficiary_name || '').toLowerCase().includes(term) ||
      (tx.merchant_name || '').toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
    const matchesRisk = riskFilter === 'ALL' || tx.risk_level === riskFilter;

    return matchesSearch && matchesStatus && matchesRisk;
  });

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="h-3 w-3" /> APPROVED</span>;
      case 'BLOCKED':
        return <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-300 border border-rose-500/30"><ShieldAlert className="h-3 w-3" /> BLOCKED</span>;
      case 'HELD':
        return <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-300 border border-rose-500/30"><Lock className="h-3 w-3" /> HELD</span>;
      case 'VERIFICATION_REQUIRED':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/30"><AlertTriangle className="h-3 w-3" /> VERIFY OTP</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300 border border-slate-700">PENDING</span>;
    }
  };

  const getRiskScoreBadge = (score?: number, level?: Transaction['risk_level']) => {
    if (score === undefined) return <span className="text-slate-500 font-mono">-</span>;

    let color = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score > 90) color = 'text-rose-400 bg-rose-500/20 border-rose-500/40';
    else if (score >= 71) color = 'text-rose-400 bg-rose-500/15 border-rose-500/30';
    else if (score >= 31) color = 'text-amber-400 bg-amber-500/10 border-amber-500/30';

    return (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${color}`}>
          {score}
        </span>
        <span className="text-[10px] text-slate-400 uppercase font-medium">{level || 'SCORE'}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
        <div className="flex flex-1 items-center gap-3 min-w-[280px]">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by TX ID, User, Device, Location, Beneficiary..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-rose-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="VERIFICATION_REQUIRED">Verification Required</option>
              <option value="HELD">Held</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-rose-500 focus:outline-none"
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="LOW">Low (0-30)</option>
              <option value="MEDIUM">Medium (31-70)</option>
              <option value="HIGH">High (71-90)</option>
              <option value="CRITICAL">Critical (91-100)</option>
            </select>
          </div>

          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 font-bold text-white shadow hover:bg-rose-500 transition"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Simulate New</span>
          </button>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3.5">Transaction ID</th>
                <th className="px-4 py-3.5">User & Profile</th>
                <th className="px-4 py-3.5">Amount</th>
                <th className="px-4 py-3.5">Payment Channel</th>
                <th className="px-4 py-3.5">Device & Location</th>
                <th className="px-4 py-3.5">Destination / Payee</th>
                <th className="px-4 py-3.5">Risk Score</th>
                <th className="px-4 py-3.5">Policy Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((tx, idx) => (
                <tr
                  key={`${tx.transaction_id}-${idx}`}
                  className="hover:bg-slate-800/40 transition group cursor-pointer"
                  onClick={() => onSelectTransaction(tx.transaction_id)}
                >
                  {/* Transaction ID */}
                  <td className="px-4 py-3 font-mono font-bold text-slate-200">
                    {tx.transaction_id}
                    <div className="text-[10px] text-slate-500 font-normal">
                      {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>

                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{tx.user_name || tx.user_id}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{tx.user_id}</div>
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3 font-mono font-bold text-white">
                    ₹{tx.amount.toLocaleString('en-IN')}
                    <div className="text-[10px] text-slate-400 font-normal">{tx.currency}</div>
                  </td>

                  {/* Channel */}
                  <td className="px-4 py-3 font-mono text-slate-300">
                    {tx.transaction_type}
                  </td>

                  {/* Device & Location */}
                  <td className="px-4 py-3 text-slate-300">
                    <div className="flex items-center gap-1 text-[11px]">
                      <Smartphone className="h-3 w-3 text-slate-500 shrink-0" />
                      <span className="truncate max-w-[120px] font-mono text-slate-300">{tx.device_id}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                      <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                      <span>{tx.location}</span>
                    </div>
                  </td>

                  {/* Beneficiary / Merchant */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-200 truncate max-w-[130px]">
                      {tx.beneficiary_name || tx.merchant_name || 'Direct Pay'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {tx.beneficiary_id || tx.merchant_category}
                    </div>
                  </td>

                  {/* Risk Score */}
                  <td className="px-4 py-3">
                    {getRiskScoreBadge(tx.risk_score, tx.risk_level)}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {getStatusBadge(tx.status)}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onSelectTransaction(tx.transaction_id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-rose-600 hover:text-white hover:border-rose-500 transition shadow"
                    >
                      <span>Investigate</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-xs text-slate-500">
            No transactions match your search criteria.
          </div>
        )}
      </div>
    </div>
  );
};

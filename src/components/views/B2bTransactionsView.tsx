import React, { useState, useEffect } from 'react';
import { Search, Filter, ShieldAlert, CheckCircle, Clock, Eye, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api.ts';

export const B2bTransactionsView: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Filters
  const [riskFilter, setRiskFilter] = useState<string>('');
  const [decisionFilter, setDecisionFilter] = useState<string>('');
  
  // Selected Tx for detail modal
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  const fetchTransactions = async () => {
    try {
      const res = await api.getTransactions();
      setTransactions(res || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    }
  };

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = transactions.filter(t => {
    const matchesSearch = 
      t.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.merchant_id && t.merchant_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.location && t.location.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesRisk = riskFilter ? t.risk_level === riskFilter : true;
    const matchesDecision = decisionFilter ? t.status === decisionFilter || t.policy_decision === decisionFilter : true;
    
    return matchesSearch && matchesRisk && matchesDecision;
  });

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold tracking-wider text-white">TRANSACTION INVESTIGATION HUB</h2>
        <p className="text-xs text-slate-400">Search, audit, and inspect transaction telemetry payloads.</p>
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
        
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transaction ID, user, merchant..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-slate-700 placeholder-slate-500"
          />
        </div>

        <div>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 p-1.5 focus:outline-none focus:border-slate-700"
          >
            <option value="">All Risk Levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <div>
          <select
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 p-1.5 focus:outline-none focus:border-slate-700"
          >
            <option value="">All Decisions</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Held for Review</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>

      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800 text-[10px] tracking-wider">
            <tr>
              <th className="p-4">Transaction ID</th>
              <th className="p-4">Timestamp</th>
              <th className="p-4">User ID</th>
              <th className="p-4">Merchant ID</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Risk Level</th>
              <th className="p-4">Decision</th>
              <th className="p-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-500">
                  <span>No transactions matching the active search filters were found.</span>
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr 
                  key={t.transaction_id}
                  className="hover:bg-slate-850/50 transition cursor-pointer"
                  onClick={() => setSelectedTx(t)}
                >
                  <td className="p-4 font-bold font-mono text-white">{t.transaction_id}</td>
                  <td className="p-4 text-slate-400">{new Date(t.timestamp).toLocaleTimeString()}</td>
                  <td className="p-4 font-mono text-slate-300">{t.user_id}</td>
                  <td className="p-4 text-slate-300">{t.merchant_id}</td>
                  <td className="p-4 font-bold text-slate-200">₹{t.amount?.toLocaleString('en-IN')}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.risk_level === 'CRITICAL' ? 'bg-red-500/10 text-red-400' :
                      t.risk_level === 'HIGH' ? 'bg-orange-500/10 text-orange-400' :
                      t.risk_level === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {t.risk_level || 'LOW'} ({t.risk_score || 0})
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                      t.status === 'BLOCKED' ? 'text-rose-400' :
                      t.status === 'PENDING' ? 'text-amber-400' :
                      'text-emerald-400'
                    }`}>
                      {t.status === 'BLOCKED' ? 'Blocked' : (t.status === 'PENDING' ? 'Review' : 'Approved')}
                    </span>
                  </td>
                  <td className="p-4 text-right text-emerald-400 font-bold group-hover:underline">
                    <Eye className="h-4 w-4 inline" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold font-mono text-slate-400">TX METRICS DETAILED PAYLOAD</span>
                <h3 className="text-sm font-black text-white font-mono">{selectedTx.transaction_id}</h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 px-2.5 py-1 transition"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Amount</span>
                  <p className="text-sm font-black text-white mt-1">₹{selectedTx.amount?.toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Risk Score</span>
                  <p className="text-sm font-mono font-black text-orange-400 mt-1">{selectedTx.risk_score || 25}/100</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Status</span>
                  <p className="text-sm font-bold text-white mt-1 uppercase text-emerald-400">{selectedTx.status}</p>
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-1.5">Telemetry Payloads</h4>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">User Identifier:</span>
                    <span className="font-mono text-white">{selectedTx.user_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Device Hardware:</span>
                    <span className="font-mono text-white">{selectedTx.device_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Origin IP:</span>
                    <span className="font-mono text-white">{selectedTx.ip_address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Merchant VPA:</span>
                    <span className="font-mono text-white">{selectedTx.merchant_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Channel:</span>
                    <span className="font-bold text-white uppercase">{selectedTx.transaction_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Location Origin:</span>
                    <span className="text-white">{selectedTx.location}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

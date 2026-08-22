import React, { useState } from 'react';
import { FraudAlert, CaseNote, SARReport } from '../../types.ts';
import { api } from '../../services/api.ts';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  User,
  Filter,
  ArrowUpRight,
  UserCheck,
  ShieldX,
  FileText,
  MessageSquare,
  Send,
  Download,
  Copy,
  Check,
  Building2,
  Lock,
  Plus
} from 'lucide-react';

interface AlertsViewProps {
  alerts: FraudAlert[];
  onSelectTransaction: (txId: string) => void;
  onRefreshAlerts: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  onSelectTransaction,
  onRefreshAlerts,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Notes Modal State
  const [activeNotesAlert, setActiveNotesAlert] = useState<FraudAlert | null>(null);
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [newNoteContent, setNewNoteContent] = useState<string>('');
  const [newNoteAuthor, setNewNoteAuthor] = useState<string>('Sarah Chen (Lead Investigator)');
  const [isLoadingNotes, setIsLoadingNotes] = useState<boolean>(false);

  // SAR Modal State
  const [activeSAR, setActiveSAR] = useState<SARReport | null>(null);
  const [isGeneratingSAR, setIsGeneratingSAR] = useState<boolean>(false);
  const [isCopiedSAR, setIsCopiedSAR] = useState<boolean>(false);

  const filtered = alerts.filter(a => {
    const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchSev = severityFilter === 'ALL' || a.severity === severityFilter;
    return matchStatus && matchSev;
  });

  const handleUpdateStatus = async (alertId: string, newStatus: string) => {
    setUpdatingId(alertId);
    try {
      await api.updateAlertStatus(alertId, newStatus);
      onRefreshAlerts();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenNotes = async (alert: FraudAlert) => {
    setActiveNotesAlert(alert);
    setIsLoadingNotes(true);
    try {
      const data = await api.getCaseNotes(alert.alert_id);
      setNotes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNotesAlert || !newNoteContent.trim()) return;
    try {
      const added = await api.createCaseNote(activeNotesAlert.alert_id, {
        author: newNoteAuthor,
        content: newNoteContent,
        action_taken: activeNotesAlert.status,
      });
      setNotes(prev => [...prev, added]);
      setNewNoteContent('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateSAR = async (txId: string) => {
    setIsGeneratingSAR(true);
    try {
      const report = await api.getSARReport(txId);
      setActiveSAR(report);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingSAR(false);
    }
  };

  const handleCopySARJson = () => {
    if (!activeSAR) return;
    navigator.clipboard.writeText(JSON.stringify(activeSAR, null, 2));
    setIsCopiedSAR(true);
    setTimeout(() => setIsCopiedSAR(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
        <div>
          <h2 className="text-base font-bold text-white">Fraud Case Management & Regulatory Triage</h2>
          <p className="text-xs text-slate-400">Collaborate on active incident investigation dockets and generate FIU regulatory filings.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-rose-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="UNDER_INVESTIGATION">Under Investigation</option>
              <option value="BLOCKED">Blocked</option>
              <option value="RESOLVED_FRAUD">Confirmed Fraud</option>
              <option value="RESOLVED_FALSE_POSITIVE">False Positive</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-rose-500 focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((alert, idx) => (
          <div
            key={`${alert.alert_id}-${idx}`}
            className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4 hover:border-slate-700 transition flex flex-col justify-between"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2.5 ${
                    alert.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    alert.severity === 'HIGH' ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20' :
                    'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{alert.user_name}</h4>
                      <span className="font-mono text-xs text-slate-400">[{alert.transaction_id}]</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Alert ID: {alert.alert_id} • {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-rose-400">
                    ₹{alert.amount.toLocaleString('en-IN')}
                  </div>
                  <span className={`inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-bold ${
                    alert.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {alert.severity} • {alert.risk_score}/100
                  </span>
                </div>
              </div>

              {/* Alert Summary */}
              <p className="mt-3 text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                {alert.summary}
              </p>
            </div>

            {/* Actions & Status Updates */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Status:</span>
                <select
                  value={alert.status}
                  disabled={updatingId === alert.alert_id}
                  onChange={(e) => handleUpdateStatus(alert.alert_id, e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="UNDER_INVESTIGATION">UNDER INVESTIGATION</option>
                  <option value="BLOCKED">BLOCKED</option>
                  <option value="RESOLVED_FRAUD">CONFIRMED FRAUD</option>
                  <option value="RESOLVED_FALSE_POSITIVE">FALSE POSITIVE</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenNotes(alert)}
                  className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition"
                  title="Case Notes & Timeline"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Notes</span>
                </button>

                <button
                  onClick={() => handleGenerateSAR(alert.transaction_id)}
                  className="flex items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-950/40 px-2.5 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-900/50 transition"
                  title="Generate Official Suspicious Activity Report (SAR)"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>SAR Filing</span>
                </button>

                <button
                  onClick={() => onSelectTransaction(alert.transaction_id)}
                  className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 transition shadow"
                >
                  <span>Investigate</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Case Notes & Timeline */}
      {activeNotesAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Forensic Investigation Notes</h3>
                <span className="text-xs text-slate-400 font-mono">Case: {activeNotesAlert.alert_id} ({activeNotesAlert.transaction_id})</span>
              </div>
              <button onClick={() => setActiveNotesAlert(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            {/* Notes List */}
            <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 text-xs">
              {notes.length === 0 ? (
                <div className="text-center py-6 text-slate-500 font-sans">No analyst notes recorded yet. Add the first case entry below.</div>
              ) : (
                notes.map(n => (
                  <div key={n.note_id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1 font-sans">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-cyan-400">{n.author}</span>
                      <span className="text-slate-500 font-mono">{new Date(n.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{n.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Log observation, customer callback verification outcome, or forensic finding..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 text-[11px]">Author: {newNoteAuthor}</span>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-1.5 font-bold text-white hover:bg-cyan-500"
                >
                  <Send className="h-3 w-3" /> Log Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Official Regulatory SAR Report */}
      {activeSAR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Suspicious Activity Report (SAR) — Official Regulatory Filing</h3>
                  <span className="font-mono text-xs text-purple-300">{activeSAR.regulatory_filing_ref}</span>
                </div>
              </div>
              <button onClick={() => setActiveSAR(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            {/* SAR Document Sheet */}
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-6 space-y-5 text-xs font-sans leading-relaxed text-slate-300">
              
              {/* Header Box */}
              <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
                <div>
                  <div className="font-bold text-white text-sm">FINANCIAL INTELLIGENCE UNIT (FIU) FORM PMLA-12</div>
                  <div className="text-slate-400 text-[11px]">{activeSAR.fiu_jurisdiction}</div>
                </div>
                <div className="text-right font-mono text-[11px]">
                  <div className="text-slate-400">Report ID: <span className="text-white font-bold">{activeSAR.report_id}</span></div>
                  <div className="text-slate-400">Timestamp: {new Date(activeSAR.generated_at).toLocaleString()}</div>
                </div>
              </div>

              {/* Transaction & Subject Box */}
              <div className="grid grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 font-bold uppercase block mb-1">Subject Account Holder</span>
                  <div className="text-white font-bold">{activeSAR.user_details?.name || activeSAR.subject_transaction.user_id}</div>
                  <div className="text-slate-400">User ID: {activeSAR.subject_transaction.user_id}</div>
                  <div className="text-slate-400">IP: {activeSAR.subject_transaction.ip_address}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase block mb-1">Flagged Transaction</span>
                  <div className="text-rose-400 font-bold text-sm">₹{activeSAR.subject_transaction.amount.toLocaleString('en-IN')} {activeSAR.subject_transaction.currency}</div>
                  <div className="text-slate-400">TX ID: {activeSAR.subject_transaction.transaction_id}</div>
                  <div className="text-slate-400">Beneficiary: {activeSAR.subject_transaction.beneficiary_account || 'N/A'}</div>
                </div>
              </div>

              {/* Regulatory Violations */}
              <div>
                <span className="font-bold text-white text-xs uppercase block mb-1.5">Identified Regulatory Violations:</span>
                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                  {activeSAR.suspected_violation_types.map((v, i) => (
                    <li key={i} className="text-amber-300 font-medium">{v}</li>
                  ))}
                </ul>
              </div>

              {/* Investigation Narrative */}
              <div>
                <span className="font-bold text-white text-xs uppercase block mb-1">AI Agent & Compliance Investigation Narrative:</span>
                <p className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-slate-200 leading-relaxed font-sans">
                  {activeSAR.investigation_summary}
                </p>
              </div>

              {/* Attestation */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
                <span className="text-emerald-400 font-bold">STATUS: {activeSAR.analyst_attestation.filing_status}</span>
                <span className="text-slate-400">Attested by: {activeSAR.analyst_attestation.analyst_name}</span>
              </div>

            </div>

            {/* Modal Bottom Buttons */}
            <div className="flex justify-end items-center gap-3">
              <button
                onClick={handleCopySARJson}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700"
              >
                {isCopiedSAR ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                <span>{isCopiedSAR ? 'JSON Copied' : 'Copy Regulatory JSON'}</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-500 transition shadow-lg shadow-purple-600/20"
              >
                <Download className="h-4 w-4" />
                <span>Export / Print Official SAR</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

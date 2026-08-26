import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Clock, AlertOctagon, CheckCircle2, 
  HelpCircle, User, Network, MessageSquare, ClipboardList,
  AlertTriangle, Check, X, ShieldCheck, FileText, Activity
} from 'lucide-react';
import { api } from '../../services/api.ts';

interface B2bIncidentsViewProps {
  initialIncidentId?: string;
  onClearNavigation?: () => void;
}

export const B2bIncidentsView: React.FC<B2bIncidentsViewProps> = ({ 
  initialIncidentId,
  onClearNavigation 
}) => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(initialIncidentId || null);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Details Tab
  const [detailTab, setDetailTab] = useState<'overview' | 'evidence' | 'transactions' | 'entities' | 'timeline' | 'ai' | 'actions' | 'audit'>('overview');

  // Form State
  const [resolutionReason, setResolutionReason] = useState<string>('');
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  const fetchIncidents = async () => {
    try {
      let url = '/api/v1/incidents?';
      if (statusFilter) url += `status=${statusFilter}&`;
      if (severityFilter) url += `severity=${severityFilter}&`;
      if (typeFilter) url += `type=${typeFilter}&`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
      }
    } catch (err) {
      console.error("Error fetching incidents:", err);
    }
  };

  const fetchIncidentDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/incidents/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedIncident(data);
      }
    } catch (err) {
      console.error("Error fetching incident details:", err);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter, severityFilter, typeFilter]);

  useEffect(() => {
    if (selectedIncidentId) {
      fetchIncidentDetails(selectedIncidentId);
    } else {
      setSelectedIncident(null);
    }
  }, [selectedIncidentId]);

  // Sync initial navigation from dashboard
  useEffect(() => {
    if (initialIncidentId) {
      setSelectedIncidentId(initialIncidentId);
    }
  }, [initialIncidentId]);

  const handleResolveIncident = async (actionStatus: string) => {
    if (!resolutionReason.trim()) {
      alert("Please provide a note or justification for this action.");
      return;
    }
    if (!selectedIncidentId) return;

    setIsSubmittingAction(true);
    try {
      // Resolve incident status
      const res = await fetch(`/api/v1/incidents/${selectedIncidentId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: actionStatus,
          reason: resolutionReason,
          analyst_id: 'security-analyst-1'
        })
      });

      if (!res.ok) throw new Error("Incident resolution failed");

      // Submit feedback for first transaction to loop it back to the ML pipeline
      if (selectedIncident && selectedIncident.transactions && selectedIncident.transactions.length > 0) {
        const firstTx = selectedIncident.transactions[0];
        const feedbackType = actionStatus === 'RESOLVED_FRAUD' ? 'CONFIRMED_FRAUD' : 'FALSE_POSITIVE';
        
        await fetch('/api/v1/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transaction_id: firstTx.transaction_id,
            incident_id: selectedIncidentId,
            analyst_id: 'security-analyst-1',
            feedback_type: feedbackType
          })
        });
      }

      alert(`Action successfully submitted: ${actionStatus}`);
      setResolutionReason('');
      fetchIncidents();
      fetchIncidentDetails(selectedIncidentId);
    } catch (err: any) {
      alert(`Error submitting action: ${err.message}`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const generateAiExplanation = async () => {
    if (!selectedIncident) return;
    setIsAiLoading(true);
    setAiExplanation('');
    try {
      const firstTxId = selectedIncident.transactions[0]?.transaction_id;
      if (!firstTxId) {
        setAiExplanation("Evidence payload unavailable.");
        return;
      }
      
      const res = await fetch(`/api/transactions/${firstTxId}/investigation`);
      if (res.ok) {
        const data = await res.json();
        setAiExplanation(data.investigation_summary || "Gemini investigation finished.");
      } else {
        throw new Error("Failed to call Gemini investigation API");
      }
    } catch (err: any) {
      setAiExplanation(`Gemini Investigation Error: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedIncidentId(null);
    if (onClearNavigation) {
      onClearNavigation();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-wider text-white">INCIDENT OPERATIONS CENTER</h2>
          <p className="text-xs text-slate-400">Coordinated entity clusters, velocities, and anomaly spike response.</p>
        </div>
        {selectedIncidentId && (
          <button
            onClick={handleBackToList}
            className="rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs font-bold text-slate-200 px-3.5 py-1.5 transition"
          >
            &larr; Back to Incidents List
          </button>
        )}
      </div>

      {!selectedIncidentId ? (
        // 1. INCIDENTS LIST VIEW
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="flex flex-wrap gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex flex-col gap-1 w-44">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 p-1.5 focus:outline-none focus:border-slate-700"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 w-44">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Severity</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 p-1.5 focus:outline-none focus:border-slate-700"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 w-44">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Incident Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 p-1.5 focus:outline-none focus:border-slate-700"
              >
                <option value="">All Types</option>
                <option value="MULE_CLUSTER">Mule Syndicate Cluster</option>
                <option value="FRAUD_SPIKE">Fraud Spike</option>
                <option value="ACCOUNT_TAKEOVER">Account Takeover</option>
                <option value="VELOCITY_ATTACK">Velocity Attack</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800 text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Incident ID</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Incident Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Txs</th>
                  <th className="p-4">Exposure</th>
                  <th className="p-4">Incident Score</th>
                  <th className="p-4">Created At</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-500">
                      <span>No incidents match the active filter parameters.</span>
                    </td>
                  </tr>
                ) : (
                  incidents.map((inc) => (
                    <tr 
                      key={inc.incident_id} 
                      className="hover:bg-slate-850/50 transition cursor-pointer"
                      onClick={() => setSelectedIncidentId(inc.incident_id)}
                    >
                      <td className="p-4 font-bold font-mono text-white">{inc.incident_id}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          inc.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          inc.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-slate-200">{inc.type}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          inc.status === 'OPEN' ? 'bg-rose-500/15 text-rose-400' :
                          inc.status === 'INVESTIGATING' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-emerald-500/15 text-emerald-400'
                        }`}>
                          {inc.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-300">{inc.affected_transactions || 1}</td>
                      <td className="p-4 font-bold text-slate-200">₹{inc.exposure_amount?.toLocaleString()}</td>
                      <td className="p-4 font-mono text-slate-400">{inc.incident_score || 0}/100</td>
                      <td className="p-4 text-slate-400">{new Date(inc.created_at).toLocaleDateString()}</td>
                      <td className="p-4 text-right text-emerald-400 font-bold text-[11px] uppercase tracking-wider group-hover:underline">
                        Investigate &rarr;
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      ) : (
        // 2. INCIDENT DETAILS VIEW
        <div className="space-y-6">
          
          {/* Details Header Card */}
          {selectedIncident && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-800 pb-4">
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedIncident.severity === 'CRITICAL' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                    }`}>{selectedIncident.severity}</span>
                    <h3 className="text-lg font-black tracking-wide text-white">{selectedIncident.type === 'MULE_CLUSTER' ? 'Coordinated Mule Syndicate' : 'Coordinated Fraud Incident'}</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">Incident Registry ID: {selectedIncident.incident_id}</p>
                </div>
                
                {/* 5 KPI Indicators */}
                <div className="flex flex-wrap gap-6 text-xs">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Potential Exposure</span>
                    <p className="text-base font-extrabold text-white">₹{selectedIncident.exposure_amount?.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Affected Txs</span>
                    <p className="text-base font-mono font-extrabold text-white">{selectedIncident.affected_transactions || 1}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Affected Users</span>
                    <p className="text-base font-mono font-extrabold text-white">{selectedIncident.users_count || 1}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Incident Score</span>
                    <p className="text-base font-mono font-extrabold text-orange-400">{selectedIncident.incident_score || 0}/100</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Detection Speed</span>
                    <p className="text-base font-mono font-extrabold text-emerald-400">41 seconds</p>
                  </div>
                </div>

              </div>

              {/* B2B 8 Tabs Navigation */}
              <div className="flex border-b border-slate-800 gap-1 pb-1 overflow-x-auto no-scrollbar">
                {[
                  { id: 'overview', label: 'Overview', icon: ClipboardList },
                  { id: 'evidence', label: 'Evidence', icon: Activity },
                  { id: 'transactions', label: 'Transactions', icon: ShieldAlert },
                  { id: 'entities', label: 'Entities', icon: Network },
                  { id: 'timeline', label: 'Timeline', icon: Clock },
                  { id: 'ai', label: 'AI Investigation', icon: MessageSquare },
                  { id: 'actions', label: 'Actions', icon: AlertOctagon },
                  { id: 'audit', label: 'Audit Log', icon: FileText }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold transition rounded-t-lg whitespace-nowrap ${
                      detailTab === tab.id
                        ? 'bg-slate-800 text-white border-b-2 border-emerald-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* 8 Tab Contents */}
              <div className="min-h-64 py-2">
                
                {/* 1. Overview */}
                {detailTab === 'overview' && (() => {
                  const confidenceScore = selectedIncident.confidence_score || 0;
                  const incidentScore = selectedIncident.incident_score || 0;
                  
                  let evidenceStrength = 'WEAK';
                  let evidenceColor = 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
                  let evidenceDetails = 'Single baseline anomaly trigger or sparse correlation signals.';
                  
                  if (confidenceScore >= 85 || incidentScore >= 75) {
                    evidenceStrength = 'STRONG';
                    evidenceColor = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                    evidenceDetails = 'Multiple independent correlation dimensions matched, significant baseline standard deviation z-score.';
                  } else if (confidenceScore >= 60 || incidentScore >= 45) {
                    evidenceStrength = 'MODERATE';
                    evidenceColor = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                    evidenceDetails = 'Partial baseline deviation detected, check recent credentials and device shifts.';
                  }

                  return (
                    <div className="space-y-4">
                      <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">Incident Narrative</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            This security incident was correlated automatically by Sentinel's multi-entity cluster engine. 
                            The pattern matches a coordinated transaction anomaly. 
                            {selectedIncident.resolution_reason && (
                              <div className="mt-3 p-3 bg-slate-900 border-l-4 border-emerald-400 text-slate-300 font-sans font-normal">
                                <span className="font-bold text-[11px] block">Resolution Reason:</span>
                                {selectedIncident.resolution_reason}
                              </div>
                            )}
                          </p>
                        </div>

                        <div className="pt-3.5 border-t border-slate-850 space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Evidence Strength Signal</span>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${evidenceColor}`}>
                              {evidenceStrength} EVIDENCE
                            </span>
                            <span className="text-xs text-slate-300 font-medium">{evidenceDetails}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Evidence */}
                {detailTab === 'evidence' && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Statistical Baseline Evidence</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {selectedIncident.evidence || "Statistical deviation exceeds standard threshold z-score = 3.0."}
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. Transactions */}
                {detailTab === 'transactions' && (
                  <div className="space-y-3">
                    {selectedIncident.transactions && selectedIncident.transactions.map((t: any) => (
                      <div key={t.transaction_id} className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 transition flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200 font-mono">{t.transaction_id}</span>
                            <span className="text-[10px] text-slate-400">{t.location} • {t.device_id}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono">User: {t.user_id} | Merchant: {t.merchant_id}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-white block">₹{t.amount?.toLocaleString('en-IN')}</span>
                          <span className={`inline-flex rounded px-1.5 py-0.2 text-[9px] font-bold ${
                            t.final_risk_score >= 80 ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>Risk Score: {t.final_risk_score}/100</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. Entities */}
                {detailTab === 'entities' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Network className="h-4 w-4 text-sky-400" />
                        <span>Connected Cluster Matrix</span>
                      </h4>
                      <div className="divide-y divide-slate-850">
                        {selectedIncident.entities && selectedIncident.entities.map((ent: any) => (
                          <div key={ent.id} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[9px] font-mono text-slate-400 uppercase">{ent.entity_type}</span>
                              <span className="font-mono font-bold text-white">{ent.entity_value}</span>
                            </div>
                            <span className="text-[10px] text-slate-400">Linked to this coordinated incident</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Timeline */}
                {detailTab === 'timeline' && (
                  <div className="space-y-4">
                    <div className="relative border-l-2 border-slate-800 ml-3 pl-5 space-y-6">
                      {selectedIncident.audit_trail && selectedIncident.audit_trail.map((action: any) => (
                        <div key={action.id} className="relative">
                          <span className="absolute -left-[27px] mt-0.5 bg-slate-950 border-2 border-slate-700 h-3 w-3 rounded-full flex items-center justify-center"></span>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white uppercase tracking-tight">{action.action}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{new Date(action.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-slate-400 font-mono">Actor: {action.analyst_id}</p>
                            <p className="text-slate-300 italic">"{action.reason}"</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. AI Investigation */}
                {detailTab === 'ai' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                        <span className="text-xs font-black text-white flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-sky-400 animate-pulse"></span>
                          AI FORENSIC ANALYSIS (GEMINI FLASH)
                        </span>
                        <button
                          onClick={generateAiExplanation}
                          disabled={isAiLoading}
                          className="rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white px-3 py-1 transition disabled:opacity-40"
                        >
                          {isAiLoading ? 'Synthesizing...' : '⚡ Generate Report'}
                        </button>
                      </div>

                      {isAiLoading ? (
                        <div className="py-12 text-center text-xs text-slate-400 space-y-3">
                          <div className="h-6 w-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                          <p>Gemini is collecting forensic evidence and auditing entity baselines...</p>
                        </div>
                      ) : aiExplanation ? (
                        <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-900/60 p-3.5 rounded-xl border border-slate-850 whitespace-pre-line">
                          {aiExplanation}
                        </p>
                      ) : (
                        <div className="py-10 text-center text-xs text-slate-500">
                          <p>Click "Generate Report" to request the Gemini AI agent to analyze this incident pattern.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 7. Actions */}
                {detailTab === 'actions' && (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    
                    {/* Action form */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-4">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Submit Analyst Decision</h4>
                      
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Decision Justification / Notes</label>
                        <textarea
                          value={resolutionReason}
                          onChange={(e) => setResolutionReason(e.target.value)}
                          placeholder="Provide audit reasoning for this status transition..."
                          className="w-full h-24 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-slate-700"
                        />
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={() => handleResolveIncident('RESOLVED_FRAUD')}
                          disabled={isSubmittingAction}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-xs font-bold text-white py-2.5 transition"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <span>Confirm Coordinated Fraud</span>
                        </button>

                        <button
                          onClick={() => handleResolveIncident('RESOLVED_FALSE_POSITIVE')}
                          disabled={isSubmittingAction}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-200 py-2.5 transition"
                        >
                          <Check className="h-4 w-4 text-emerald-400" />
                          <span>Mark as False Positive</span>
                        </button>

                        <button
                          onClick={() => handleResolveIncident('RESOLVED')}
                          disabled={isSubmittingAction}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-bold text-white py-2.5 transition"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Resolve & Close Incident</span>
                        </button>
                      </div>
                    </div>

                  </div>
                )}

                {/* 8. Audit Log */}
                {detailTab === 'audit' && (
                  <div className="space-y-3 text-xs">
                    {selectedIncident.audit_trail && selectedIncident.audit_trail.map((log: any) => (
                      <div key={log.id} className="p-3 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between">
                        <div>
                          <span className="font-mono text-slate-400 font-bold block">{log.action}</span>
                          <span className="text-[10px] text-slate-400">Actor: {log.analyst_id} | "{log.reason}"</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

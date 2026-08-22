import React from 'react';
import { AuditLog } from '../../types.ts';
import {
  Bot,
  Terminal,
  Clock,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Lock,
  Cpu,
  Layers
} from 'lucide-react';

interface AgentActivityViewProps {
  auditLogs: AuditLog[];
}

export const AgentActivityView: React.FC<AgentActivityViewProps> = ({ auditLogs }) => {
  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">AI Agent Autonomous Execution Stream</h2>
            <span className="flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-xs font-mono font-bold text-cyan-400">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              LIVE DISPATCHER
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time trace logs of AI tool calls, feature queries, ML inferences, and deterministic policy enforcement.
          </p>
        </div>
      </div>

      {/* Audit Log Timeline */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white mb-2">Agent & Engine Audit Trail</h3>

        <div className="space-y-3">
          {auditLogs.map((log, idx) => {
            const isAgent = log.actor === 'AI_INVESTIGATION_AGENT';
            const isPolicy = log.actor === 'POLICY_ENGINE';
            const isML = log.actor === 'ML_FRAUD_MODEL';

            return (
              <div
                key={`${log.log_id}-${idx}`}
                className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-slate-700"
              >
                <div className={`rounded-xl p-2.5 shrink-0 ${
                  isAgent ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                  isPolicy ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                  isML ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                  'bg-slate-800 text-slate-300'
                }`}>
                  {isAgent ? <Bot className="h-5 w-5" /> :
                   isPolicy ? <Lock className="h-5 w-5" /> :
                   isML ? <Cpu className="h-5 w-5" /> :
                   <Terminal className="h-5 w-5" />}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white">{log.action}</span>
                      <span className="font-mono text-[10px] text-slate-400">[{log.actor}]</span>
                      {log.transaction_id && (
                        <span className="rounded bg-slate-800 px-1.5 py-0.2 font-mono text-[10px] text-slate-300">
                          {log.transaction_id}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="rounded-lg bg-black/60 p-2.5 border border-slate-800/80 font-mono text-[11px] text-slate-300">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

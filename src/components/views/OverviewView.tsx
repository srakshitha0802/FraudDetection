import React from 'react';
import { AnalyticsData, FraudAlert, Transaction } from '../../types.ts';
import {
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Zap,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Lock,
  User
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { SimulatorTestView } from './SimulatorTestView.tsx';

interface OverviewViewProps {
  analytics: AnalyticsData | null;
  alerts: FraudAlert[];
  transactions: Transaction[];
  onSelectTransaction: (txId: string) => void;
  onOpenSimulator: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  analytics,
  alerts,
  transactions,
  onSelectTransaction,
  onOpenSimulator,
}) => {
  if (!analytics) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-500">
        Loading Sentinel SOC telemetry...
      </div>
    );
  }

  const { summary, risk_distribution, hourly_trend, category_breakdown } = analytics;

  const pieData = [
    { name: 'Low Risk (0-30)', value: risk_distribution.low, color: '#10b981' },
    { name: 'Medium Risk (31-70)', value: risk_distribution.medium, color: '#f59e0b' },
    { name: 'High Risk (71-90)', value: risk_distribution.high, color: '#f43f5e' },
    { name: 'Critical (91-100)', value: risk_distribution.critical, color: '#e11d48' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Status Overview */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 shadow-xl">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Security Operations Center (SOC) Command
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-signal payment risk scoring, XGBoost ML classification, and Gemini AI agent investigations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/20 hover:from-rose-500 hover:to-orange-500 transition"
          >
            <Zap className="h-4 w-4" />
            <span>Launch Attack Simulation</span>
          </button>
        </div>
      </div>

      {/* Payment Transaction Simulator & Automated Verification Test Harness */}
      <SimulatorTestView />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Fraud Volume Prevented */}
        <div className="rounded-xl border border-rose-500/20 bg-slate-900/90 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Fraud Prevented</span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-400 font-mono">
              ₹{summary.fraud_prevented_volume.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {summary.fraud_prevented_count} suspicious transactions held/blocked
            </p>
          </div>
        </div>

        {/* Metric 2: Total Analyzed */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Analyzed</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white font-mono">
              {summary.total_transactions}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              ₹{summary.total_volume.toLocaleString('en-IN')} total throughput
            </p>
          </div>
        </div>

        {/* Metric 3: Active Alerts */}
        <div className="rounded-xl border border-amber-500/20 bg-slate-900/90 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Alerts</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-400 font-mono">
              {summary.active_alerts_count}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Under SOC analyst triage queue
            </p>
          </div>
        </div>

        {/* Metric 4: Average Risk Score */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Risk Score</span>
            <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white font-mono">
              {summary.avg_risk_score} <span className="text-xs text-slate-400 font-normal">/ 100</span>
            </div>
            <p className="text-[11px] text-emerald-400 mt-1">
              98.4% ML model precision
            </p>
          </div>
        </div>
      </div>

      {/* Middle Charts: 24h Transaction Volume vs Fraud Spike + Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Hourly Volume Chart (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">24-Hour Transaction Stream & Fraud Spikes</h3>
              <p className="text-xs text-slate-400">Notice night-time attack surges between 01:00 AM - 05:00 AM</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Legitimate
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                Fraud Invocations
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourly_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="legitColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fraudColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="legitimate" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#legitColor)" />
                <Area type="monotone" dataKey="fraud" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#fraudColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Breakdown Donut (1 Col) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Risk Tier Breakdown</h3>
            <p className="text-xs text-slate-400">Distribution across active transaction pool</p>
          </div>

          <div className="h-44 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {pieData.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-300">{item.name.split(' ')[0]}:</span>
                <span className="font-bold font-mono text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent High-Risk Alerts & Threat Typology Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Alerts Feed (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Critical Threat Alerts Queue</h3>
              <p className="text-xs text-slate-400">Transactions requiring immediate analyst or policy intervention</p>
            </div>
            <span className="text-xs font-mono text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
              {alerts.length} Live Items
            </span>
          </div>

          <div className="space-y-3">
            {alerts.slice(0, 4).map((alert, idx) => (
              <div
                key={`${alert.alert_id}-${idx}`}
                onClick={() => onSelectTransaction(alert.transaction_id)}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 hover:border-slate-700 hover:bg-slate-800/40 cursor-pointer transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${
                    alert.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    alert.severity === 'HIGH' ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20' :
                    'bg-amber-500/20 text-amber-300'
                  }`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{alert.user_name}</span>
                      <span className="font-mono text-[11px] text-slate-400">({alert.transaction_id})</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        alert.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">{alert.summary}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-rose-400">
                      ₹{alert.amount.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Risk: {alert.risk_score}/100
                    </div>
                  </div>
                  <button className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-600 transition">
                    <span>Investigate</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Threat Typology Categories (1 Col) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Threat Vector Typology</h3>
            <p className="text-xs text-slate-400">Breakdown by attack archetype</p>
          </div>

          <div className="space-y-3 my-3">
            {category_breakdown.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">{cat.category}</span>
                  <span className="font-mono text-slate-400">{cat.share} ({cat.count})</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-500"
                    style={{ width: cat.share }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            Account takeover (ATO) and money mule rings represent 67% of blocked fraud attempts.
          </div>
        </div>
      </div>
    </div>
  );
};

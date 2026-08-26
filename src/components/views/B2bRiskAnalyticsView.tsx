import React from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie } from 'recharts';
import { FileText, ShieldAlert, Award, AlertOctagon } from 'lucide-react';

export const B2bRiskAnalyticsView: React.FC = () => {
  // Chart 1: Fraud rate by payment method
  const paymentData = [
    { name: 'UPI', fraud: 2.8, legit: 97.2 },
    { name: 'Card', fraud: 1.2, legit: 98.8 },
    { name: 'NetBanking', fraud: 3.5, legit: 96.5 },
    { name: 'Wallet', fraud: 0.8, legit: 99.2 },
    { name: 'Crypto', fraud: 12.4, legit: 87.6 }
  ];

  // Chart 2: Risk level distribution
  const riskDistribution = [
    { name: 'Low (0-29)', value: 8520, color: '#10b981' },
    { name: 'Medium (30-59)', value: 1240, color: '#f59e0b' },
    { name: 'High (60-79)', value: 622, color: '#f97316' },
    { name: 'Critical (80-100)', value: 141, color: '#ef4444' }
  ];

  // Chart 3: Device OS Risk
  const deviceData = [
    { name: 'Linux', fraud: 4.2 },
    { name: 'Windows', fraud: 1.8 },
    { name: 'macOS', fraud: 0.9 },
    { name: 'iOS', fraud: 1.1 },
    { name: 'Android', fraud: 3.4 },
    { name: 'Other', fraud: 7.8 }
  ];

  const COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold tracking-wider text-white">FRAUD RISK & ATTACK SURFACE ANALYTICS</h2>
        <p className="text-xs text-slate-400">Statistical distribution of composite risk scores, payment method velocity anomalies, and device profiles.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* Chart 1: Payment Method Fraud Rate */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Fraud Rate by Payment Channel (%)</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: 11 }} />
                <Bar dataKey="fraud" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Risk Score Distribution */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Composite Risk Distribution (Transaction Count)</h4>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: 11 }} />
                <Legend formatter={(value, entry, index) => <span className="text-xs text-slate-300">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Device OS Fraud Rate */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Fraud Rate by Device Operating System (%)</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deviceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: 11 }} />
                <Bar dataKey="fraud" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table: Top Suspicious Merchants */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Top Suspicious Entities / Merchants</h4>
          <div className="divide-y divide-slate-800 overflow-hidden">
            {[
              { id: 'M_MULE_DESK', name: 'Offshore Crypto Bridge / FastExchange', rate: '28.4%', volume: '₹14.8L', status: 'CRITICAL' },
              { id: 'M_TRANSFER', name: 'Mule Syndicate Payee', rate: '12.2%', volume: '₹4.8L', status: 'HIGH' },
              { id: 'M_ZOMATO', name: 'Fast food food delivery apps', rate: '0.4%', volume: '₹34K', status: 'LOW' }
            ].map(m => (
              <div key={m.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">{m.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">Merchant ID: {m.id}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-rose-500 block">Fraud Rate: {m.rate}</span>
                  <span className="text-[10px] text-slate-400">Volume at Risk: {m.volume}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

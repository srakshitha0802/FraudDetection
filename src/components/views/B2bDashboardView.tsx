import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  ShieldCheck, ShieldAlert, AlertOctagon, 
  TrendingUp, TrendingDown, DollarSign, Activity, Play
} from 'lucide-react';
import { api } from '../../services/api.ts';

interface B2bDashboardViewProps {
  onNavigate: (tab: string, extra?: any) => void;
}

export const B2bDashboardView: React.FC<B2bDashboardViewProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState({
    total_transactions: 10523,
    suspicious_transactions: 142,
    active_incidents: 3,
    potential_exposure: 1874000
  });

  const [incidents, setIncidents] = useState<any[]>([]);
  const [isSimulating, setIsSimulating] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const metRes = await fetch('/api/v1/metrics');
      if (metRes.ok) {
        const data = await metRes.json();
        setMetrics(data);
      }
      
      const incRes = await fetch('/api/v1/incidents');
      if (incRes.ok) {
        const data = await incRes.json();
        setIncidents(data.slice(0, 5)); // show top 5 active
      }
    } catch (err) {
      console.warn("Failed to load dashboard metrics:", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulate = async (scenario: string) => {
    setIsSimulating(scenario);
    try {
      // We generate synthetic events directly targeting /api/v1/risk/analyze to trigger real detections
      const baseTime = new Date();
      let txsToSend: any[] = [];
      
      if (scenario === 'NORMAL') {
        // Send normal transactions
        txsToSend = Array.from({ length: 5 }).map((_, i) => ({
          transaction_id: `TX-NORM-${Date.now()}-${i}`,
          user_id: 'U102',
          amount: 1500 + Math.floor(Math.random() * 800),
          device_id: 'DEV102_IPHONE14',
          ip_address: '49.207.210.45',
          location: 'Bengaluru',
          payment_method: 'UPI',
          merchant_id: 'M_ZOMATO',
          merchant_category: 'GROCERY',
          timestamp: new Date(baseTime.getTime() - i * 60000).toISOString()
        }));
      } else if (scenario === 'SPIKE') {
        // Trigger a fraud rate spike at a single merchant
        txsToSend = Array.from({ length: 15 }).map((_, i) => ({
          transaction_id: `TX-SPIKE-${Date.now()}-${i}`,
          user_id: `U${200 + i}`,
          amount: 45000 + Math.floor(Math.random() * 5000),
          device_id: `DEV-NEW-${i}`,
          ip_address: `103.14.78.${10 + i}`,
          location: 'Mumbai',
          payment_method: 'WIRE_TRANSFER',
          merchant_id: 'M_MULE_DESK',
          merchant_category: 'CRYPTO',
          timestamp: new Date(baseTime.getTime() - i * 10000).toISOString()
        }));
      } else if (scenario === 'ATO') {
        // Account Takeover simulation
        // First fail login, reset pwd, then make large transfer on new device
        txsToSend = [
          {
            transaction_id: `TX-ATO-LEAK-${Date.now()}`,
            user_id: 'U412', // Ananya Rao
            amount: 98000,
            device_id: 'DEV778', // Emulator
            ip_address: '103.145.74.19',
            location: 'Hyderabad',
            payment_method: 'UPI',
            merchant_id: 'M_MULE_DESK',
            merchant_category: 'CRYPTO',
            timestamp: new Date().toISOString()
          }
        ];
      } else if (scenario === 'MULE') {
        // Shared entity cluster (multiple accounts send to B992 mule)
        txsToSend = Array.from({ length: 4 }).map((_, i) => ({
          transaction_id: `TX-MULE-${Date.now()}-${i}`,
          user_id: `U${100 + i}`,
          amount: 80000,
          device_id: 'DEV778', // Shared device
          ip_address: '103.145.74.19',
          location: 'Delhi',
          payment_method: 'UPI',
          merchant_id: 'M_MULE_DESK',
          merchant_category: 'CRYPTO',
          beneficiary_id: 'B992', // Flagged mule beneficiary
          timestamp: new Date().toISOString()
        }));
      } else if (scenario === 'VELOCITY') {
        // High velocity attack: rapid transaction burst
        txsToSend = Array.from({ length: 6 }).map((_, i) => ({
          transaction_id: `TX-VEL-${Date.now()}-${i}`,
          user_id: 'U205',
          amount: 75000,
          device_id: 'DEV205_PIXEL8',
          ip_address: '103.22.14.88',
          location: 'Mumbai',
          payment_method: 'UPI',
          merchant_id: 'M_MULE_DESK',
          merchant_category: 'TRANSFER',
          timestamp: new Date(baseTime.getTime() - i * 5000).toISOString() // 5 seconds apart
        }));
      }

      // Send to analyze API sequentially
      for (const tx of txsToSend) {
        await fetch('/api/v1/risk/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tx)
        });
      }

      // Re-trigger incident detector
      await fetch('/api/v1/incidents/detect', { method: 'POST' });
      
      alert(`Simulation scenario "${scenario}" injected successfully into real risk engine. Refreshing feed.`);
      fetchDashboardData();
    } catch (err: any) {
      alert(`Simulation Error: ${err.message}`);
    } finally {
      setIsSimulating(null);
    }
  };

  // Mock chart trend data
  const trendData = [
    { name: '10:00', volume: 400, fraud: 12 },
    { name: '11:00', volume: 600, fraud: 15 },
    { name: '12:00', volume: 800, fraud: 10 },
    { name: '13:00', volume: 1100, fraud: 45 }, // spike
    { name: '14:00', volume: 900, fraud: 25 },
    { name: '15:00', volume: 1200, fraud: 18 },
    { name: '16:00', volume: 1400, fraud: 14 }
  ];

  return (
    <div className="space-y-6">
      
      {/* Page Title Header */}
      <div>
        <h2 className="text-xl font-bold tracking-wider text-white">SYSTEM MONITOR & INTELLIGENCE DASHBOARD</h2>
        <p className="text-xs text-slate-400">Sentinel real-time threat activity monitor, telemetry analysis, and incident prioritizer.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Total Transactions */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Volume</span>
            <h3 className="text-2xl font-black text-white mt-1">{metrics.total_transactions}</h3>
            <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>+12.4% vs yesterday</span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-slate-850 flex items-center justify-center border border-slate-800">
            <Activity className="h-5 w-5 text-sky-400" />
          </div>
        </div>

        {/* Suspicious Transactions */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alert Triggered</span>
            <h3 className="text-2xl font-black text-rose-500 mt-1">{metrics.suspicious_transactions}</h3>
            <div className="text-[10px] text-rose-400 font-bold flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>+4.2% rate change</span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-slate-850 flex items-center justify-center border border-slate-800">
            <AlertOctagon className="h-5 w-5 text-rose-500" />
          </div>
        </div>

        {/* Active Incidents */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Incidents</span>
            <h3 className="text-2xl font-black text-amber-500 mt-1">{metrics.active_incidents}</h3>
            <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
              <TrendingDown className="h-3 w-3" />
              <span>-2 incidents resolved</span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-slate-850 flex items-center justify-center border border-slate-800">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
          </div>
        </div>

        {/* Potential Exposure */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Exposure Value</span>
            <h3 className="text-2xl font-black text-white mt-1">
              ₹{(metrics.potential_exposure / 100000.0).toFixed(1)}L
            </h3>
            <div className="text-[10px] text-slate-400 font-medium mt-1">
              <span>Estimated financial risk</span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-slate-850 flex items-center justify-center border border-slate-800">
            <DollarSign className="h-5 w-5 text-emerald-400" />
          </div>
        </div>

      </div>

      {/* Simulator / Demo Mode Control panel */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Demo Simulation Controller</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Inject synthetic traffic scenarios directly into the live XGBoost/LightGBM risk scoring engine to verify real-time incident correlation.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          
          <button
            onClick={() => handleSimulate('NORMAL')}
            disabled={isSimulating !== null}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 text-slate-200 px-3 py-2 text-xs font-bold transition"
          >
            <Play className="h-3 w-3 text-emerald-400" />
            <span>Normal Traffic</span>
          </button>

          <button
            onClick={() => handleSimulate('SPIKE')}
            disabled={isSimulating !== null}
            className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/25 disabled:opacity-40 text-rose-300 px-3 py-2 text-xs font-bold transition"
          >
            <Play className="h-3 w-3 text-rose-500" />
            <span>Fraud Spike</span>
          </button>

          <button
            onClick={() => handleSimulate('ATO')}
            disabled={isSimulating !== null}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/25 disabled:opacity-40 text-amber-300 px-3 py-2 text-xs font-bold transition"
          >
            <Play className="h-3 w-3 text-amber-500" />
            <span>Account Takeover (ATO)</span>
          </button>

          <button
            onClick={() => handleSimulate('MULE')}
            disabled={isSimulating !== null}
            className="flex items-center gap-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/25 disabled:opacity-40 text-purple-300 px-3 py-2 text-xs font-bold transition"
          >
            <Play className="h-3 w-3 text-purple-500" />
            <span>Mule Syndicate Cluster</span>
          </button>

          <button
            onClick={() => handleSimulate('VELOCITY')}
            disabled={isSimulating !== null}
            className="flex items-center gap-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/25 disabled:opacity-40 text-sky-300 px-3 py-2 text-xs font-bold transition"
          >
            <Play className="h-3 w-3 text-sky-500" />
            <span>High Velocity Burst</span>
          </button>
          
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Trend chart area */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Transaction Telemetry & Threat Trends</h4>
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500"></span> Total Volume</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500"></span> Fraud Detections</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFraud" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: 11 }} />
                <Area type="monotone" dataKey="volume" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorVol)" strokeWidth={2} />
                <Area type="monotone" dataKey="fraud" stroke="#f43f5e" fillOpacity={1} fill="url(#colorFraud)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Incident Feed */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Live Incident Feed</h4>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-400">REAL-TIME</span>
          </div>
          
          <div className="space-y-3 overflow-y-auto max-h-64 pr-1">
            {incidents.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <span>No active security incidents.</span>
              </div>
            ) : (
              incidents.map((inc) => (
                <div
                  key={inc.incident_id}
                  onClick={() => onNavigate('incidents', { incidentId: inc.incident_id })}
                  className="group cursor-pointer rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950 p-3 flex items-start justify-between transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${
                        inc.severity === 'CRITICAL' ? 'bg-red-500' : (inc.severity === 'HIGH' ? 'bg-orange-500' : 'bg-amber-500')
                      }`}></span>
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-tight">{inc.type}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">{inc.incident_id}</p>
                    <p className="text-[10px] text-slate-400">{new Date(inc.created_at).toLocaleTimeString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-white block">₹{inc.exposure_amount?.toLocaleString('en-IN')}</span>
                    <span className="text-[9px] font-bold text-emerald-400 uppercase">Review &rarr;</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

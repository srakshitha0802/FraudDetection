import React from 'react';
import { ModelMetricsData } from '../../types.ts';
import {
  Cpu,
  BarChart2,
  TrendingUp,
  Activity,
  CheckCircle,
  Clock,
  Layers,
  Zap
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface AnalyticsViewProps {
  metrics: ModelMetricsData | null;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-500">
        Loading ML Model telemetry & ROC metrics...
      </div>
    );
  }

  const {
    model_name,
    accuracy,
    precision,
    recall,
    f1_score,
    roc_auc,
    latency_p95_ms,
    confusion_matrix,
    feature_importances,
    roc_curve,
    training_samples,
  } = metrics;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Machine Learning & Model Evaluation</h2>
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-xs font-mono font-bold text-cyan-400">
              {model_name}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supervised Gradient Boosted Decision Tree ensemble trained on {training_samples.toLocaleString()} transaction vectors.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs font-mono text-slate-300">
          <Clock className="h-4 w-4 text-emerald-400" />
          <span>P95 Latency: <strong className="text-white">{latency_p95_ms} ms</strong></span>
        </div>
      </div>

      {/* Model Scorecards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Accuracy', val: `${(accuracy * 100).toFixed(1)}%`, desc: 'Overall classification correctness' },
          { label: 'Precision', val: `${(precision * 100).toFixed(1)}%`, desc: 'Low false-positive rate' },
          { label: 'Recall', val: `${(recall * 100).toFixed(1)}%`, desc: 'High fraud detection sensitivity' },
          { label: 'F1 Score', val: (f1_score).toFixed(3), desc: 'Harmonic balance of precision/recall' },
          { label: 'ROC-AUC', val: (roc_auc).toFixed(3), desc: 'Discriminative power (near-perfect)' },
        ].map((m, idx) => (
          <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{m.label}</span>
            <div className="text-2xl font-black text-white font-mono mt-1">{m.val}</div>
            <p className="text-[10px] text-slate-500 mt-1 truncate">{m.desc}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid: Feature Importance + ROC Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Feature Importance Bar Chart */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">XGBoost Feature Importance Weights</h3>
              <p className="text-xs text-slate-400">Gain attribution across decision trees</p>
            </div>
            <BarChart2 className="h-4 w-4 text-rose-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feature_importances} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <XAxis type="number" stroke="#64748b" fontSize={10} domain={[0, 0.35]} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={130} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="score" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROC Curve Chart */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">ROC Curve (TPR vs. FPR)</h3>
              <p className="text-xs text-slate-400">Receiver Operating Characteristic (AUC = {roc_auc})</p>
            </div>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={roc_curve} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <XAxis dataKey="fpr" stroke="#64748b" fontSize={10} />
                <YAxis dataKey="tpr" stroke="#64748b" fontSize={10} domain={[0, 1]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Line type="monotone" dataKey="tpr" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Confusion Matrix Breakdown */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-1">Confusion Matrix (Validation Split: 10,000 tx)</h3>
        <p className="text-xs text-slate-400 mb-4">Empirical evaluation of true/false detections on holdout evaluation data</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          
          {/* True Positive */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
            <span className="text-[10px] uppercase font-bold text-emerald-400">True Positives (TP)</span>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {confusion_matrix.true_positives.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Accurately detected and blocked fraud attempts</p>
          </div>

          {/* False Positive */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
            <span className="text-[10px] uppercase font-bold text-amber-400">False Positives (FP)</span>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {confusion_matrix.false_positives}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Legitimate users asked for step-up verification</p>
          </div>

          {/* False Negative */}
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
            <span className="text-[10px] uppercase font-bold text-rose-400">False Negatives (FN)</span>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {confusion_matrix.false_negatives}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Missed fraud (0.33% slip rate)</p>
          </div>

          {/* True Negative */}
          <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
            <span className="text-[10px] uppercase font-bold text-slate-300">True Negatives (TN)</span>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {confusion_matrix.true_negatives.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Seamless frictionless approvals</p>
          </div>
        </div>
      </div>
    </div>
  );
};

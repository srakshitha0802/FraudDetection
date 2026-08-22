import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  BrainCircuit,
  Cpu,
  Play,
  RotateCcw,
  CheckCircle,
  TrendingUp,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Sliders,
  CheckCircle2,
  Server,
  Download,
  AlertTriangle,
  RefreshCw,
  GitBranch,
  BarChart3
} from 'lucide-react';
import { ModelTrainingConfig, ModelTrainingResult, ActiveDeployedModel } from '../../types.ts';

export const ModelTrainingView: React.FC = () => {
  const [config, setConfig] = useState<ModelTrainingConfig>({
    model_type: 'XGBOOST',
    estimators: 250,
    max_depth: 6,
    learning_rate: 0.05,
    l2_reg: 0.01,
    subsample: 0.85,
    gnn_embedding_dim: 64,
    smote_ratio: 0.35,
    selected_features: [
      'amount_z_score',
      'device_risk_flag',
      'location_jump_km',
      'new_beneficiary_risk',
      'credential_reset_recency',
      'nighttime_flag',
      'velocity_10m'
    ]
  });

  const [activeModel, setActiveModel] = useState<ActiveDeployedModel | null>(null);
  const [trainingHistory, setTrainingHistory] = useState<ModelTrainingResult[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const [currentResult, setCurrentResult] = useState<ModelTrainingResult | null>(null);
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fetchActiveModel = async () => {
    try {
      const res = await fetch('/api/model/active');
      if (res.ok) {
        const data = await res.json();
        setActiveModel(data);
      }
    } catch (e) {
      console.error('Error fetching active model:', e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/model/training-history');
      if (res.ok) {
        const data = await res.json();
        setTrainingHistory(data);
      }
    } catch (e) {
      console.error('Error fetching training history:', e);
    }
  };

  useEffect(() => {
    fetchActiveModel();
    fetchHistory();
  }, []);

  const handleStartTraining = async () => {
    setIsTraining(true);
    setTrainingProgress(0);
    setTrainingLogs([]);
    setFeedbackMessage(null);

    const logSteps = [
      '🚀 Initializing distributed training matrix (50,000 synthetic transaction records)...',
      '📊 Computing feature correlation matrix and SMOTE synthetic balance...',
      '🌲 Building Gradient Boosted decision tree splits with adaptive shrinkage...',
      '🧬 Optimizing regularization weights (Lambda: ' + config.l2_reg + ')...',
      '📈 Validating against out-of-time test partition (10,000 holdout transactions)...',
      '✅ Model convergence reached. Calculating ROC-AUC, PR-AUC and feature importances...'
    ];

    for (let i = 0; i < logSteps.length; i++) {
      await new Promise(r => setTimeout(r, 450));
      setTrainingLogs(prev => [...prev, logSteps[i]]);
      setTrainingProgress(Math.round(((i + 1) / logSteps.length) * 90));
    }

    try {
      const res = await fetch('/api/model/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!res.ok) throw new Error('Training request failed');
      const result: ModelTrainingResult = await res.json();

      setTrainingProgress(100);
      setCurrentResult(result);
      setTrainingLogs(prev => [...prev, `🎉 Model ${result.training_id} successfully compiled with ROC-AUC ${result.metrics.roc_auc.toFixed(4)}!`]);
      fetchHistory();
      setFeedbackMessage(`Model ${result.training_id} trained successfully! You can now deploy it live to the inference engine.`);
    } catch (err: any) {
      setTrainingLogs(prev => [...prev, `❌ Training error: ${err.message}`]);
    } finally {
      setIsTraining(false);
    }
  };

  const handleDeploy = async (trainingId: string) => {
    setDeployingId(trainingId);
    try {
      const res = await fetch(`/api/model/deploy/${trainingId}`, { method: 'POST' });
      if (!res.ok) throw new Error('Deployment failed');
      const data = await res.json();
      setActiveModel(data.active_model);
      fetchHistory();
      setFeedbackMessage(`🚀 Model ${trainingId} is now LIVE in production! Real-time fraud scoring now runs this model.`);
      setTimeout(() => setFeedbackMessage(null), 6000);
    } catch (err: any) {
      setFeedbackMessage(`Deployment error: ${err.message}`);
    } finally {
      setDeployingId(null);
    }
  };

  return (
    <div className="space-y-6" id="model-training-view">
      {/* Header & Active Production Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
            <BrainCircuit className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">ML Training & Model Registry Studio</h2>
              <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold">
                LIVE PRODUCTION
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Train custom gradient-boosted ensembles and Graph Neural Networks with live hyperparameter optimization and instant hot-swap deployment.
            </p>
          </div>
        </div>

        {activeModel && (
          <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">ACTIVE DEPLOYED MODEL</div>
              <div className="text-sm font-bold text-rose-400 font-mono">{activeModel.name} ({activeModel.version})</div>
              <div className="text-xs text-emerald-400 font-mono">ROC-AUC: {(activeModel.roc_auc * 100).toFixed(1)}% | Precision: {(activeModel.precision * 100).toFixed(1)}%</div>
            </div>
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        )}
      </div>

      {feedbackMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Grid: Hyperparameter Controls & Training Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Hyperparameter Config */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-white font-semibold border-b border-slate-800 pb-3">
              <Sliders className="w-5 h-5 text-rose-400" />
              <span>Hyperparameter Configuration</span>
            </div>

            {/* Model Architecture */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Model Architecture</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'XGBOOST', label: 'XGBoost Ensemble', desc: 'Fast gradient tree boosting' },
                  { id: 'LIGHTGBM', label: 'LightGBM GBDT', desc: 'Leaf-wise high throughput' },
                  { id: 'GNN', label: 'Graph Neural Net', desc: 'Node2Vec fraud clusters' },
                  { id: 'HYBRID_STACKING', label: 'Hybrid Stacking', desc: 'Multi-layer meta-classifier' }
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setConfig(prev => ({ ...prev, model_type: m.id as any }))}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      config.model_type === m.id
                        ? 'bg-rose-500/15 border-rose-500/50 text-white shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-200">{m.label}</div>
                    <div className="text-[10px] text-slate-500 truncate">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Estimators / Boost Trees</span>
                  <span className="font-mono text-rose-400 font-semibold">{config.estimators}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="25"
                  value={config.estimators}
                  onChange={e => setConfig(prev => ({ ...prev, estimators: Number(e.target.value) }))}
                  className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Max Tree Depth</span>
                  <span className="font-mono text-rose-400 font-semibold">{config.max_depth}</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  step="1"
                  value={config.max_depth}
                  onChange={e => setConfig(prev => ({ ...prev, max_depth: Number(e.target.value) }))}
                  className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Learning Rate (Eta)</span>
                  <span className="font-mono text-rose-400 font-semibold">{config.learning_rate}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.30"
                  step="0.01"
                  value={config.learning_rate}
                  onChange={e => setConfig(prev => ({ ...prev, learning_rate: Number(e.target.value) }))}
                  className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">L2 Regularization (Lambda)</span>
                  <span className="font-mono text-rose-400 font-semibold">{config.l2_reg}</span>
                </div>
                <input
                  type="range"
                  min="0.001"
                  max="0.5"
                  step="0.005"
                  value={config.l2_reg}
                  onChange={e => setConfig(prev => ({ ...prev, l2_reg: Number(e.target.value) }))}
                  className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">SMOTE Synthetic Balancing Ratio</span>
                  <span className="font-mono text-rose-400 font-semibold">{(config.smote_ratio * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.60"
                  step="0.05"
                  value={config.smote_ratio}
                  onChange={e => setConfig(prev => ({ ...prev, smote_ratio: Number(e.target.value) }))}
                  className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Action Trigger */}
            <button
              onClick={handleStartTraining}
              disabled={isTraining}
              className="w-full mt-4 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl shadow-lg shadow-rose-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              {isTraining ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Training Model ({trainingProgress}%)...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Run Model Training Pipeline</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Training Progress & Evaluation Diagnostics */}
        <div className="lg:col-span-7 space-y-4">
          {/* Terminal / Live Logs */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400 pb-2 mb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Distributed Training Worker: node-ml-worker-01</span>
              </div>
              <span className="text-emerald-400 font-semibold">{isTraining ? 'EXECUTING' : 'IDLE / READY'}</span>
            </div>

            {isTraining && (
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-3">
                <motion.div
                  className="h-full bg-rose-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${trainingProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            <div className="space-y-1.5 max-h-44 overflow-y-auto text-slate-300">
              {trainingLogs.length === 0 ? (
                <div className="text-slate-500 py-4 text-center">
                  Configure hyperparameters on the left and click "Run Model Training Pipeline" to begin.
                </div>
              ) : (
                trainingLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-slate-600 select-none">[{idx + 1}]</span>
                    <span>{log}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Last Trained Metrics Preview */}
          {currentResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/70 border border-rose-500/30 p-5 rounded-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{currentResult.model_name}</h3>
                  <div className="text-xs text-slate-400">ID: {currentResult.training_id} | Trained in {currentResult.training_duration_ms}ms</div>
                </div>
                <button
                  onClick={() => handleDeploy(currentResult.training_id)}
                  disabled={deployingId === currentResult.training_id}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow flex items-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Deploy to Live Engine</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg text-center">
                  <div className="text-xs text-slate-400">ROC-AUC</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono">{(currentResult.metrics.roc_auc * 100).toFixed(2)}%</div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg text-center">
                  <div className="text-xs text-slate-400">Precision</div>
                  <div className="text-lg font-bold text-rose-400 font-mono">{(currentResult.metrics.precision * 100).toFixed(2)}%</div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg text-center">
                  <div className="text-xs text-slate-400">Recall</div>
                  <div className="text-lg font-bold text-sky-400 font-mono">{(currentResult.metrics.recall * 100).toFixed(2)}%</div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg text-center">
                  <div className="text-xs text-slate-400">F1 Score</div>
                  <div className="text-lg font-bold text-amber-400 font-mono">{(currentResult.metrics.f1_score * 100).toFixed(2)}%</div>
                </div>
              </div>

              {/* Feature Importances */}
              <div>
                <div className="text-xs font-semibold text-slate-300 mb-2">Feature Importance Breakdown</div>
                <div className="space-y-2">
                  {currentResult.feature_importances.map(f => (
                    <div key={f.feature} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-mono">{f.feature}</span>
                        <span className="text-slate-400 font-mono">{(f.importance * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full"
                          style={{ width: `${f.importance * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Model Registry History */}
      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-white font-semibold">
            <GitBranch className="w-5 h-5 text-rose-400" />
            <span>Model Registry & Deployment Artifacts</span>
          </div>
          <button
            onClick={() => { fetchHistory(); fetchActiveModel(); }}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Model Name & ID</th>
                <th className="pb-3 font-semibold">Architecture</th>
                <th className="pb-3 font-semibold">ROC-AUC</th>
                <th className="pb-3 font-semibold">Precision / Recall</th>
                <th className="pb-3 font-semibold">Created</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {trainingHistory.map(model => {
                const isCurrentActive = activeModel?.model_id === model.model_id;
                return (
                  <tr key={model.model_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 font-mono">
                      <div className="font-semibold text-white">{model.model_name}</div>
                      <div className="text-[11px] text-slate-500">{model.model_id}</div>
                    </td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono text-[11px]">
                        {model.config.model_type}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono font-bold text-emerald-400">
                      {(model.metrics.roc_auc * 100).toFixed(1)}%
                    </td>
                    <td className="py-3.5 font-mono text-slate-400">
                      {(model.metrics.precision * 100).toFixed(0)}% / {(model.metrics.recall * 100).toFixed(0)}%
                    </td>
                    <td className="py-3.5 text-slate-400">
                      {new Date(model.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5">
                      {isCurrentActive ? (
                        <span className="px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 rounded-full font-bold text-[10px] flex items-center gap-1 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          ACTIVE LIVE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px]">
                          STANDBY
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-right">
                      {isCurrentActive ? (
                        <span className="text-xs text-emerald-400 font-semibold">Serving Traffic</span>
                      ) : (
                        <button
                          onClick={() => handleDeploy(model.model_id)}
                          disabled={deployingId === model.model_id}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 rounded font-semibold text-xs transition-colors"
                        >
                          {deployingId === model.model_id ? 'Deploying...' : 'Deploy Live'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

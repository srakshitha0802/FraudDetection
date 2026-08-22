import React, { useState, useEffect } from 'react';
import { CustomRule, Transaction } from '../../types.ts';
import { api } from '../../services/api.ts';
import {
  Sliders,
  Plus,
  Play,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  AlertOctagon,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Tag,
  Shield,
  Layers
} from 'lucide-react';

export const RulesStudioView: React.FC = () => {
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [dryRunResult, setDryRunResult] = useState<any | null>(null);
  const [isDryRunning, setIsDryRunning] = useState<boolean>(false);

  // New Rule Form State
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [action, setAction] = useState<string>('STEP_UP_OTP');
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [riskPoints, setRiskPoints] = useState<number>(30);
  const [field, setField] = useState<string>('amount');
  const [operator, setOperator] = useState<string>('>=');
  const [val, setVal] = useState<string>('50000');
  const [tagInput, setTagInput] = useState<string>('AML, HIGH_TICKET');

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCustomRules();
      setRules(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (id: string) => {
    try {
      await api.toggleCustomRule(id);
      fetchRules();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom detection rule?')) return;
    try {
      await api.deleteCustomRule(id);
      fetchRules();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDryRun = async () => {
    setIsDryRunning(true);
    try {
      const res = await api.dryRunRule({
        conditions: [{ field, operator, value: isNaN(Number(val)) ? val : Number(val) }],
        logic,
      });
      setDryRunResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDryRunning(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
      await api.createCustomRule({
        name,
        description,
        severity,
        action,
        logic,
        risk_contribution: Number(riskPoints),
        conditions: [{ field, operator, value: isNaN(Number(val)) ? val : Number(val) }],
        tags,
      });
      setIsModalOpen(false);
      setName('');
      setDescription('');
      fetchRules();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-purple-400" />
            <h2 className="text-base font-bold text-white">Dynamic Fraud Policy & Custom Rules Studio</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Author, calibrate, simulate, and deploy real-time deterministic fraud rules with zero-downtime hot reloading.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRules}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Rules</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/20 hover:bg-purple-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Custom Rule</span>
          </button>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule, idx) => {
          const isCritical = rule.severity === 'CRITICAL';
          const isHigh = rule.severity === 'HIGH';

          return (
            <div
              key={`${rule.rule_id}-${idx}`}
              className={`rounded-2xl border bg-slate-900/90 p-5 shadow-xl transition space-y-3.5 ${
                rule.enabled ? 'border-slate-800' : 'border-slate-800/40 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase font-mono ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : isHigh
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {rule.severity}
                    </span>
                    <span className="font-mono text-xs text-slate-500">{rule.rule_id}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm mt-1">{rule.name}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(rule.rule_id)}
                    title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    className="text-slate-400 hover:text-white transition"
                  >
                    {rule.enabled ? (
                      <ToggleRight className="h-6 w-6 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-slate-600" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(rule.rule_id)}
                    title="Delete Rule"
                    className="text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{rule.description}</p>

              {/* Conditions Tag Box */}
              <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-500">Execution Logic ({rule.logic})</div>
                {rule.conditions.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-purple-300">
                    <span>IF</span>
                    <span className="text-amber-400 font-semibold">{c.field}</span>
                    <span className="text-white">{c.operator}</span>
                    <span className="text-emerald-400 font-bold">{String(c.value)}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-purple-500/10 px-2 py-0.5 font-mono text-purple-300 text-[11px]">
                    Action: {rule.action}
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    +{rule.risk_contribution} Risk Pts
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Hits: <span className="font-bold text-white">{rule.last_triggered_count || 0}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Dynamic Rule Creator & Dry-Run Simulator */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Rule Builder & Backtest Simulation</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Rule Title</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Flag Large Wire Transfers to Newly Created Beneficiaries"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Detailed Description / Regulatory Rationale</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Intercepts funds if transfer exceeds ₹50,000 to an account added under 1 hour ago."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Dynamic Condition Builder */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-3">
                <span className="font-bold text-slate-300">Condition Parameters</span>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Target Field</label>
                    <select
                      value={field}
                      onChange={(e) => setField(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-200"
                    >
                      <option value="amount">amount</option>
                      <option value="amount_z_score">amount_z_score</option>
                      <option value="location_jump_km">location_jump_km</option>
                      <option value="transaction_velocity_1h">transaction_velocity_1h</option>
                      <option value="failed_login_count">failed_login_count</option>
                      <option value="new_device">new_device (boolean)</option>
                      <option value="merchant_category">merchant_category</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Operator</label>
                    <select
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-200"
                    >
                      <option value=">=">&gt;= (Greater or Equal)</option>
                      <option value=">">&gt; (Greater)</option>
                      <option value="<=">&lt;= (Less or Equal)</option>
                      <option value="==">== (Exact Match)</option>
                      <option value="!=">!= (Not Equal)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Threshold Value</label>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => setVal(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleDryRun}
                    disabled={isDryRunning}
                    className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-950/30 px-3 py-1.5 text-purple-300 hover:bg-purple-900/40 font-bold"
                  >
                    {isDryRunning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-purple-300" />}
                    <span>Dry-Run Backtest On Dataset</span>
                  </button>
                </div>

                {/* Dry Run Simulation Result */}
                {dryRunResult && (
                  <div className="rounded-lg border border-purple-500/30 bg-purple-950/20 p-3 space-y-2 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-purple-200 font-bold">
                      <span>Backtest Results ({dryRunResult.total_historical_analyzed} Transactions Evaluated)</span>
                      <span className="text-emerald-400 font-bold">Precision: {dryRunResult.precision_estimate}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-900/60 p-2 rounded">
                        <div className="text-slate-400 text-[10px]">Total Hits</div>
                        <div className="text-sm font-bold text-white">{dryRunResult.matched_count} ({dryRunResult.hit_rate})</div>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded">
                        <div className="text-slate-400 text-[10px]">True Positives</div>
                        <div className="text-sm font-bold text-emerald-400">{dryRunResult.estimated_true_positives}</div>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded">
                        <div className="text-slate-400 text-[10px]">False Positives</div>
                        <div className="text-sm font-bold text-amber-400">{dryRunResult.estimated_false_positives}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-200"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Enforcement Action</label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-200"
                  >
                    <option value="STEP_UP_OTP">STEP_UP_OTP (2FA Challenge)</option>
                    <option value="HOLD_ESCROW">HOLD_ESCROW (Escrow Quarantine)</option>
                    <option value="BLOCK">BLOCK (Hard Interception)</option>
                    <option value="APPROVE">APPROVE (Explicit Pass)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Risk Contribution (+Pts)</label>
                  <input
                    type="number"
                    value={riskPoints}
                    onChange={(e) => setRiskPoints(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="e.g. AML, SANCTIONS, NIGHT_VELOCITY"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-5 py-2 font-bold text-white hover:bg-purple-500 transition shadow-lg shadow-purple-600/20"
                >
                  Deploy Rule To Production
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

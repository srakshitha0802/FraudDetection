import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  ShieldAlert,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Zap,
  Smartphone,
  PhoneCall,
  Lock,
  ArrowRight,
  Sparkles,
  Bot
} from 'lucide-react';
import { api } from '../services/api.ts';

interface ThreatSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ATTACK_SCENARIOS = [
  {
    id: 'digital-arrest',
    title: 'Digital Arrest / Fake Police Video Call',
    icon: PhoneCall,
    tag: 'Critical Threat',
    color: 'rose',
    description: 'Scammers on WhatsApp video call dressed as police threatening arrest for an imaginary narcotics package, demanding ₹1.5 Lakhs.'
  },
  {
    id: 'reverse-upi-collect',
    title: 'Reverse UPI Collect / Refund Trick',
    icon: Smartphone,
    tag: 'High Velocity Trap',
    color: 'amber',
    description: 'Fraudster sends a ₹15,000 Collect Request claiming it is to give you an OLX refund, tricking you into entering your UPI PIN.'
  },
  {
    id: 'electricity-sms-apk',
    title: 'Electricity Bill Cut Phishing APK',
    icon: Zap,
    tag: 'Malware Dropper',
    color: 'sky',
    description: 'SMS threatening power disconnection tonight at 9:30 PM, dropping an AnyDesk screen-recording APK.'
  },
  {
    id: 'sim-swap-midnight',
    title: 'SIM Swap & Midnight Velocity Drain',
    icon: Lock,
    tag: 'Account Takeover',
    color: 'indigo',
    description: 'SIM cloned at midnight with automated bot velocity drain of ₹48,000 from an unverified emulator.'
  }
];

export const ThreatSimulatorModal: React.FC<ThreatSimulatorModalProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState('digital-arrest');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const runSimulation = async (scId: string) => {
    setSelectedScenarioId(scId);
    setIsSimulating(true);
    setSimulationData(null);
    setActiveStepIndex(0);

    try {
      const res = await api.simulateAttackVector(scId);
      setSimulationData(res.scenario);

      // Animate steps progression
      for (let i = 0; i < (res.scenario?.simulationSteps?.length || 4); i++) {
        await new Promise(r => setTimeout(r, 600));
        setActiveStepIndex(i + 1);
      }
    } catch (err: any) {
      alert('Simulation error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSimulating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-indigo-500/30 bg-slate-900 shadow-2xl p-6 sm:p-8 text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-sky-500/20 border border-indigo-500/40 text-indigo-400">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Real-World Attack Sandbox & Shield Tester
                </h3>
                <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold text-indigo-400 border border-indigo-500/20">
                  Live AI Defense Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Experience how Sentinel PayGuard catches, isolates, and neutralizes attack vectors in real-time
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scenario Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-6">
          {ATTACK_SCENARIOS.map(sc => {
            const isSelected = selectedScenarioId === sc.id;
            const Icon = sc.icon;
            return (
              <button
                key={sc.id}
                onClick={() => runSimulation(sc.id)}
                disabled={isSimulating}
                className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                    : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-slate-800 text-indigo-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {sc.tag}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white leading-snug">{sc.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                    {sc.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-semibold text-indigo-400">
                  <span>{isSelected && isSimulating ? 'Simulating...' : 'Launch Simulation'}</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Simulation Output Canvas */}
        {simulationData && (
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                  Active Simulation Vector: {simulationData.vector}
                </span>
                <h4 className="text-base font-bold text-white mt-0.5">{simulationData.name}</h4>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-400 border border-rose-500/20">
                  <ShieldAlert className="h-3.5 w-3.5" /> Threat Level: {simulationData.severity}
                </span>
              </div>
            </div>

            {/* Interactive Timeline Steps */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Real-Time Defense Telemetry & Step-by-Step Interception
              </h5>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {simulationData.simulationSteps?.map((step: any, index: number) => {
                  const isReached = index < activeStepIndex;
                  return (
                    <motion.div
                      key={step.step}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: isReached ? 1 : 0.4, y: 0 }}
                      className={`p-4 rounded-2xl border transition ${
                        step.status === 'PROTECTED'
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                          : step.status === 'INTERCEPTED'
                          ? 'bg-sky-950/30 border-sky-500/40 text-sky-300'
                          : step.status === 'ALERT'
                          ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950/60">
                          Step {step.step} • {step.time}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {step.status}
                        </span>
                      </div>
                      <h6 className="text-xs font-bold text-white">{step.title}</h6>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{step.detail}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* AI Verdict Box */}
            {simulationData.aiVerdict && activeStepIndex >= 4 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <h5 className="text-sm font-bold text-white">
                      Sentinel AI Shield: Threat Successfully Neutralized
                    </h5>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Fraud Risk: {Math.round(simulationData.aiVerdict.fraudProbability * 100)}% (Critical)
                  </span>
                </div>

                <p className="text-xs text-emerald-200/90 leading-relaxed font-medium">
                  {simulationData.aiVerdict.safeguardSummary}
                </p>

                <div className="rounded-xl bg-slate-950/80 p-3 text-[11px] text-slate-300 flex items-center justify-between">
                  <span className="text-slate-400">
                    <strong>Statutory Rule:</strong> {simulationData.aiVerdict.rbiProtectionRule}
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    Action: {simulationData.aiVerdict.actionTaken}
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

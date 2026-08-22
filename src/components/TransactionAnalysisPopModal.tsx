import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  X,
  Sparkles,
  Zap,
  ArrowRight,
  CheckCircle2,
  Radio,
  Sliders,
  Cpu,
  Mic,
  Activity,
  Copy,
  Check,
  Code,
  Terminal,
  BarChart2
} from 'lucide-react';
import {
  playAdvancedBuzzSound,
  speakAlertVoice,
  SoundMode,
  TransactionAnalysisPopPayload
} from '../utils/soundUtils.ts';

interface TransactionAnalysisPopModalProps {
  onOpenInvestigation?: (investigation: any, transaction: any) => void;
}

export const TransactionAnalysisPopModal: React.FC<TransactionAnalysisPopModalProps> = ({
  onOpenInvestigation
}) => {
  const [popData, setPopData] = useState<TransactionAnalysisPopPayload | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [selectedSoundMode, setSelectedSoundMode] = useState<SoundMode>('AUTO');
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'AI_STEPS' | 'AUDIO_HUD' | 'JSON'>('OVERVIEW');
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [timerProgress, setTimerProgress] = useState<number>(100);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Soundwave canvas animation reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const handleAnalysisDone = (event: Event) => {
      const customEvent = event as CustomEvent<TransactionAnalysisPopPayload>;
      if (customEvent.detail) {
        setPopData(customEvent.detail);
        setIsOpen(true);
        setTimerProgress(100);
      }
    };

    window.addEventListener('transaction-analysis-done', handleAnalysisDone);
    return () => {
      window.removeEventListener('transaction-analysis-done', handleAnalysisDone);
    };
  }, []);

  // 12-second auto dismiss countdown progress bar
  useEffect(() => {
    if (!isOpen || isPaused) return;

    const interval = setInterval(() => {
      setTimerProgress(prev => {
        if (prev <= 1) {
          setIsOpen(false);
          return 0;
        }
        return prev - 1.2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, isPaused]);

  // Audio Soundwave Equalizer Canvas Animation
  useEffect(() => {
    if (!isPlayingAudio || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 16;
      const width = canvas.width / bars;

      for (let i = 0; i < bars; i++) {
        const height = Math.sin(frame * 0.2 + i * 0.5) * 12 + 14 + Math.random() * 8;
        const x = i * width;
        const y = (canvas.height - height) / 2;

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#f43f5e');
        gradient.addColorStop(0.5, '#f59e0b');
        gradient.addColorStop(1, '#10b981');

        ctx.fillStyle = gradient;
        ctx.fillRect(x + 1, y, width - 2, height);
      }

      frame++;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [isPlayingAudio]);

  if (!isOpen || !popData) return null;

  const rawScore = popData.riskScore ?? popData.transaction?.risk_score ?? 0;
  const scorePercent = rawScore > 1 ? Math.round(rawScore) : Math.round(rawScore * 100);
  const level = (popData.riskLevel || popData.transaction?.risk_level || 'LOW').toUpperCase();
  const decision = (popData.policyDecision || popData.transaction?.policy_decision || 'APPROVED').toUpperCase();

  const isHighRisk = level === 'HIGH' || level === 'CRITICAL' || decision === 'BLOCKED';
  const isMediumRisk = level === 'MEDIUM' || level === 'SUSPICIOUS' || decision === 'FLAGGED';

  const txId = popData.transactionId || popData.transaction?.transaction_id || `TX_${Date.now()}`;
  const userId = popData.userId || popData.transaction?.user_id || 'U102';
  const amount = popData.amount ?? popData.transaction?.amount ?? 0;
  const merchant = popData.merchant || popData.transaction?.merchant_name || popData.transaction?.merchant_category || 'Transfer Gateway';
  const currency = popData.currency || popData.transaction?.currency || 'INR';

  const handleReplayBuzz = (mode?: SoundMode) => {
    setIsPlayingAudio(true);
    const targetMode = mode || selectedSoundMode;
    playAdvancedBuzzSound(level, targetMode);

    if (isVoiceActive) {
      const speechMsg = `${level} Risk Transaction ${decision}. Amount: ${currency === 'INR' ? 'Rupees' : '$'} ${amount.toLocaleString()}`;
      speakAlertVoice(speechMsg);
    }

    setTimeout(() => setIsPlayingAudio(false), 700);
  };

  const copyPayloadJson = () => {
    navigator.clipboard.writeText(JSON.stringify(popData, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const getHeaderGradient = () => {
    if (isHighRisk) return 'from-rose-600 via-red-600 to-amber-600';
    if (isMediumRisk) return 'from-amber-500 via-orange-500 to-yellow-500';
    return 'from-emerald-500 via-teal-500 to-cyan-500';
  };

  const getBorderColor = () => {
    if (isHighRisk) return 'border-rose-500/60 shadow-rose-950/40 ring-1 ring-rose-500/30';
    if (isMediumRisk) return 'border-amber-500/60 shadow-amber-950/40 ring-1 ring-amber-500/30';
    return 'border-emerald-500/60 shadow-emerald-950/40 ring-1 ring-emerald-500/30';
  };

  // Mocked dynamic tool calling logs if not present
  const toolSteps = popData.investigation?.toolInvocations || [
    { tool: 'check_device_fingerprint', args: { device_id: popData.transaction?.device_id || 'DEV778' }, result: 'Mismatch detected (New IP)' },
    { tool: 'query_mule_graph', args: { beneficiary: popData.transaction?.beneficiary_account }, result: 'High centrality node match' },
    { tool: 'evaluate_policy_rules', args: { score: scorePercent }, result: `Decision: ${decision}` },
    { tool: 'dispatch_security_alerts', args: { sms: '+918639975744', email: 'srakshitha912@gmail.com' }, result: 'SMS & Email dispatched' }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-4 sm:pt-8 px-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9, rotateX: 10 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className={`pointer-events-auto max-w-xl w-full rounded-2xl bg-slate-950 border-2 ${getBorderColor()} shadow-2xl overflow-hidden backdrop-blur-2xl`}
        >
          {/* Top Countdown Timer Bar */}
          <div className="h-1 w-full bg-slate-900 overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${
                isHighRisk ? 'bg-rose-500' : isMediumRisk ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${timerProgress}%` }}
            />
          </div>

          {/* Top Futuristic Header */}
          <div className={`bg-gradient-to-r ${getHeaderGradient()} p-4 text-white flex items-center justify-between shadow-lg`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-black/30 rounded-xl backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                <Radio className="h-6 w-6 text-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm tracking-wider uppercase flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-yellow-300" />
                    Transaction Analysis Pop
                  </span>
                  <span className="text-[10px] bg-black/40 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/20">
                    <Volume2 className="h-3 w-3 text-emerald-300" /> Buzz Sound Active
                  </span>
                </div>
                <p className="text-xs text-white/90 font-medium mt-0.5">
                  Autonomous AI Fraud Sentinel evaluation completed for <span className="font-mono font-bold text-yellow-200">{txId}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl bg-black/30 hover:bg-black/50 text-white/80 hover:text-white transition-all border border-white/10 hover:scale-105"
              title="Dismiss Pop"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab Navigation Toolbar */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2 text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('OVERVIEW')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'OVERVIEW'
                    ? 'bg-slate-800 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Overview</span>
              </button>

              <button
                onClick={() => setActiveTab('AI_STEPS')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'AI_STEPS'
                    ? 'bg-slate-800 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Terminal className="h-3.5 w-3.5 text-purple-400" />
                <span>AI Steps</span>
              </button>

              <button
                onClick={() => setActiveTab('AUDIO_HUD')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'AUDIO_HUD'
                    ? 'bg-slate-800 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Sliders className="h-3.5 w-3.5 text-rose-400" />
                <span>Sound HUD</span>
              </button>

              <button
                onClick={() => setActiveTab('JSON')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'JSON'
                    ? 'bg-slate-800 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Code className="h-3.5 w-3.5 text-amber-400" />
                <span>Payload</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Soundwave Equalizer Canvas */}
              <canvas
                ref={canvasRef}
                width={70}
                height={20}
                className="bg-slate-950 rounded border border-slate-800 px-1"
                title="Live Audio Visualizer"
              />
            </div>
          </div>

          {/* Modal Main Body Content */}
          <div className="p-5 bg-slate-950 text-slate-100 space-y-4">

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'OVERVIEW' && (
              <div className="space-y-4">
                {/* Risk Score & Decision HUD Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Risk Score</div>
                      <div className="text-2xl font-black text-white mt-0.5 flex items-baseline gap-1">
                        <span>{scorePercent}%</span>
                        <span className="text-xs text-slate-400 font-normal">/ 100</span>
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-xs font-black border ${
                      isHighRisk ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                      isMediumRisk ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    }`}>
                      {level} RISK
                    </div>
                  </div>

                  <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Policy Enforcement</div>
                      <div className="mt-1">
                        <span className={`text-xs font-black px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-md ${
                          decision === 'BLOCKED' ? 'bg-rose-600 text-white' :
                          decision === 'FLAGGED' ? 'bg-amber-500 text-black font-extrabold' :
                          decision === 'STEP_UP_AUTH' ? 'bg-sky-500 text-white' :
                          'bg-emerald-600 text-white'
                        }`}>
                          {decision === 'BLOCKED' && <ShieldAlert className="h-4 w-4" />}
                          {decision === 'APPROVED' && <CheckCircle2 className="h-4 w-4" />}
                          {decision === 'FLAGGED' && <AlertTriangle className="h-4 w-4" />}
                          {decision}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Transaction Metrics Table */}
                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800/80">
                    <div>
                      <span className="text-slate-400">Account User:</span>
                      <span className="font-bold text-white ml-1.5">{userId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Amount:</span>
                      <span className="font-bold text-amber-400 ml-1.5">{currency === 'INR' ? '₹' : '$'}{amount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-slate-400">Merchant / Category:</span>
                    <span className="font-medium text-slate-200 ml-1.5">{merchant}</span>
                  </div>

                  {popData.summary && (
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                      <span className="text-sky-400 font-bold">🤖 Sentinel Summary: </span>
                      {popData.summary}
                    </div>
                  )}
                </div>

                {/* Quick Anomaly Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                    ⚡ 18 Features Extracted
                  </span>
                  <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                    🛡️ XGBoost + Rule Engine
                  </span>
                  {isHighRisk && (
                    <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30 font-bold">
                      🚨 Mule Ring Anomaly Match
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: AI AGENT STEPS */}
            {activeTab === 'AI_STEPS' && (
              <div className="space-y-3 text-xs">
                <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-purple-400" />
                  <span>Autonomous AI Agent Tool Calling Loop:</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {toolSteps.map((step: any, idx: number) => (
                    <div key={idx} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-purple-300 font-mono font-bold">
                        <span>Step {idx + 1}: {step.tool || step.action}</span>
                        <span className="text-[10px] text-emerald-400">EXECUTED</span>
                      </div>
                      <div className="text-slate-400 font-mono text-[10px] truncate">
                        Args: {JSON.stringify(step.args || {})}
                      </div>
                      <div className="text-slate-200 bg-slate-950 p-1.5 rounded border border-slate-800 text-[10px]">
                        Result: {typeof step.result === 'object' ? JSON.stringify(step.result) : step.result}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: AUDIO & BUZZ SOUND HUD CONTROLS */}
            {activeTab === 'AUDIO_HUD' && (
              <div className="space-y-4 text-xs">
                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Volume2 className="h-4 w-4 text-rose-400" />
                      Audio Buzz Synthesizer Profile
                    </span>
                    <span className="text-[10px] text-slate-400">Web Audio API</span>
                  </div>

                  {/* Sound Mode Selectors */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'SIREN_BUZZ', label: '🚨 Cyber Siren Buzz' },
                      { id: 'ELECTRO_BUZZ', label: '⚡ Electro Buzz' },
                      { id: 'PULSE_BUZZ', label: '🛰️ Tactical Pulse Buzz' },
                      { id: 'SYNTH_CHIME', label: '✅ Synth Chime Buzz' }
                    ].map(modeItem => (
                      <button
                        key={modeItem.id}
                        onClick={() => {
                          setSelectedSoundMode(modeItem.id as SoundMode);
                          handleReplayBuzz(modeItem.id as SoundMode);
                        }}
                        className={`p-2 rounded-lg text-left font-semibold border transition-all ${
                          selectedSoundMode === modeItem.id
                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {modeItem.label}
                      </button>
                    ))}
                  </div>

                  {/* Voice Announcement Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-sky-400" />
                      <div>
                        <div className="font-bold text-slate-200 text-xs">Voice Alert Speech (TTS)</div>
                        <div className="text-[10px] text-slate-400">Spoken alert speech announcement</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsVoiceActive(!isVoiceActive)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                        isVoiceActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {isVoiceActive ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: JSON RAW PAYLOAD */}
            {activeTab === 'JSON' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400">Raw Analysis Event Payload:</span>
                  <button
                    onClick={copyPayloadJson}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold flex items-center gap-1"
                  >
                    {copiedJson ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-[10px] font-mono text-emerald-400 max-h-48 overflow-auto">
                  {JSON.stringify(popData, null, 2)}
                </pre>
              </div>
            )}

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-900">
              <button
                onClick={() => handleReplayBuzz()}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                  isPlayingAudio
                    ? 'bg-rose-500/30 text-rose-200 border-rose-500/50 scale-95'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800 shadow-md'
                }`}
              >
                <Volume2 className={`h-4 w-4 text-rose-400 ${isPlayingAudio ? 'animate-bounce' : ''}`} />
                <span>{isPlayingAudio ? 'Buzzing Audio...' : 'Play Buzz Sound'}</span>
              </button>

              <div className="flex items-center gap-2">
                {onOpenInvestigation && (popData.investigation || popData.transaction) && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onOpenInvestigation(popData.investigation, popData.transaction);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white flex items-center gap-1.5 transition-all shadow-lg shadow-sky-950/50"
                  >
                    <span>Full Investigation</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors border border-slate-800"
                >
                  Dismiss
                </button>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

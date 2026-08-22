// Web Audio API & Web Speech API Advanced Audio Buzz Synthesizer Engine

export type SoundMode = 'SIREN_BUZZ' | 'ELECTRO_BUZZ' | 'PULSE_BUZZ' | 'SYNTH_CHIME' | 'AUTO';

export const playAdvancedBuzzSound = (
  riskLevel: string = 'MEDIUM',
  soundMode: SoundMode = 'AUTO'
) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const level = (riskLevel || '').toUpperCase();
    const isHigh = level === 'HIGH' || level === 'CRITICAL' || level === 'BLOCKED';
    const isMedium = level === 'MEDIUM' || level === 'SUSPICIOUS' || level === 'FLAGGED';

    const now = ctx.currentTime;

    // Determine target mode
    const mode = soundMode === 'AUTO' 
      ? (isHigh ? 'SIREN_BUZZ' : isMedium ? 'ELECTRO_BUZZ' : 'SYNTH_CHIME') 
      : soundMode;

    if (mode === 'SIREN_BUZZ') {
      // 🚨 High Severity Cyber-Siren FM Oscillating Buzz
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const mainGain = ctx.createGain();

      carrier.type = 'sawtooth';
      modulator.type = 'sine';

      carrier.frequency.setValueAtTime(220, now);
      modulator.frequency.setValueAtTime(18, now); // FM vibrato rate

      modGain.gain.setValueAtTime(120, now);
      modulator.connect(carrier.frequency);

      mainGain.gain.setValueAtTime(0.5, now);
      mainGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      carrier.connect(mainGain);
      mainGain.connect(ctx.destination);

      carrier.start(now);
      modulator.start(now);
      carrier.stop(now + 0.45);
      modulator.stop(now + 0.45);

      // Sub-Bass impact pulse
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'square';
      subOsc.frequency.setValueAtTime(55, now);
      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.3);

    } else if (mode === 'ELECTRO_BUZZ') {
      // ⚡ Dual-tone Staccato Square Buzz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = 'square';
      osc1.frequency.setValueAtTime(280, now);
      osc1.frequency.exponentialRampToValueAtTime(140, now + 0.15);

      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(340, now + 0.18);
      osc2.frequency.exponentialRampToValueAtTime(170, now + 0.35);

      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0.4, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.35);

    } else if (mode === 'PULSE_BUZZ') {
      // 🛰️ Low Frequency Tactical Pulse Buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.3);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);

    } else {
      // ✅ Smooth Harmonic 3-Tone Synth Chime Buzz
      const freqs = [350, 440, 523.25];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0.25, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.25);
      });
    }

    // Mobile Haptic Vibration API
    if ('vibrate' in navigator) {
      if (isHigh) {
        navigator.vibrate([180, 80, 180, 80, 250]);
      } else if (isMedium) {
        navigator.vibrate([120, 60, 120]);
      } else {
        navigator.vibrate(80);
      }
    }
  } catch (err) {
    console.warn('Audio Buzz playback error:', err);
  }
};

// Web Speech API Voice Text-To-Speech
export const speakAlertVoice = (text: string) => {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any pending speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    console.warn('Speech synthesis unavailable:', e);
  }
};

export interface TransactionAnalysisPopPayload {
  transactionId?: string;
  userId?: string;
  amount?: number;
  currency?: string;
  merchant?: string;
  riskScore?: number;
  riskLevel?: string;
  policyDecision?: string;
  summary?: string;
  timestamp?: string;
  transaction?: any;
  investigation?: any;
  voiceAnnouncementEnabled?: boolean;
}

export const playBuzzSound = (riskLevel: string = 'MEDIUM') => {
  playAdvancedBuzzSound(riskLevel, 'AUTO');
};

export const triggerTransactionAnalysisPop = (payload: TransactionAnalysisPopPayload) => {
  const riskLevel = payload.riskLevel || payload.transaction?.risk_level || 'LOW';
  
  // Play buzz sound effect
  playBuzzSound(riskLevel);

  // Optional spoken alert announcement if high/critical risk
  const decision = (payload.policyDecision || payload.transaction?.policy_decision || '').toUpperCase();
  const amount = payload.amount || payload.transaction?.amount || 0;
  
  if (decision === 'BLOCKED' || riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
    const spokenText = `Security Alert. Transaction of ₹${amount.toLocaleString()} has been analyzed and BLOCKED due to high risk.`;
    speakAlertVoice(spokenText);
  }

  // Dispatch global custom event for the Pop Modal UI
  const event = new CustomEvent('transaction-analysis-done', {
    detail: payload,
  });
  window.dispatchEvent(event);
};

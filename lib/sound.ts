'use client';

// Lightweight synthesized sound effects via the Web Audio API — no audio files to fetch/host.
// Respects a localStorage mute flag so players can turn it off without losing the setting on refresh.

const MUTE_KEY = 'avalon_sound_muted';

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(MUTE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, String(muted));
  } catch {
    // ignore
  }
}

type ToneOptions = {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  glideTo?: number;
};

function playTone({ freq, duration, type = 'sine', gain = 0.15, delay = 0, glideTo }: ToneOptions) {
  const audioCtx = getContext();
  if (!audioCtx || isSoundMuted()) return;

  const startTime = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  if (glideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(glideTo, 1), startTime + duration);
  }

  gainNode.gain.setValueAtTime(gain, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

export const sfx = {
  // Soft ping — it's your turn to act
  notify() {
    playTone({ freq: 880, duration: 0.15, type: 'sine', gain: 0.12 });
    playTone({ freq: 1108, duration: 0.2, type: 'sine', gain: 0.1, delay: 0.08 });
  },
  // Quick tick — a card/vote flips over
  flip() {
    playTone({ freq: 300, duration: 0.08, type: 'triangle', gain: 0.08, glideTo: 500 });
  },
  // Ascending chime — quest success
  success() {
    playTone({ freq: 523.25, duration: 0.15, type: 'sine', gain: 0.14 });
    playTone({ freq: 659.25, duration: 0.15, type: 'sine', gain: 0.14, delay: 0.1 });
    playTone({ freq: 783.99, duration: 0.3, type: 'sine', gain: 0.14, delay: 0.2 });
  },
  // Descending buzz — quest fail
  fail() {
    playTone({ freq: 233, duration: 0.25, type: 'sawtooth', gain: 0.1 });
    playTone({ freq: 174.6, duration: 0.35, type: 'sawtooth', gain: 0.1, delay: 0.15 });
  },
  // Triumphant fanfare — good wins
  victory() {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      playTone({ freq, duration: 0.35, type: 'triangle', gain: 0.13, delay: i * 0.12 });
    });
  },
  // Low ominous drone — evil wins
  doom() {
    playTone({ freq: 110, duration: 1.4, type: 'sawtooth', gain: 0.1, glideTo: 55 });
    playTone({ freq: 116.5, duration: 1.4, type: 'sawtooth', gain: 0.07, delay: 0.1, glideTo: 58 });
  },
};

/** Soft WebAudio synth: rounded waves, a low-pass "felt" filter and gentle envelopes — no audio files. */
let context: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.35;

/** Slow attack and a low cutoff keep every sound round, like a felt mallet. */
const ATTACK = 0.025;
const SOFT_CUTOFF = 900;

function audio(): { ctx: AudioContext; out: AudioNode } | null {
  try {
    if (!context) {
      context = new AudioContext();
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = SOFT_CUTOFF;
      master = context.createGain();
      master.gain.value = volume;
      master.connect(filter).connect(context.destination);
    }
    if (context.state === 'suspended') void context.resume();
    return master ? { ctx: context, out: master } : null;
  } catch (error) {
    console.warn('WebAudio unavailable', error);
    return null;
  }
}

export function setVolume(value: number): void {
  volume = value;
  if (master) master.gain.value = value;
}

function tone(freq: number, duration: number, type: OscillatorType, level: number, slideTo?: number, delay = 0): void {
  const a = audio();
  if (!a) return;
  const { ctx, out } = a;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(level, start + ATTACK);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(out);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function whoosh(duration: number, level: number, cutoff: number): void {
  const a = audio();
  if (!a) return;
  const { ctx, out } = a;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / length;
    data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * t);
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = cutoff;
  filter.Q.value = 0.7;
  gain.gain.value = level;
  source.connect(filter).connect(gain).connect(out);
  source.start();
}

/** Soft sine "marimba" notes an octave lower, plus a faint muffled rustle for card movement. */
export const SOUNDS = {
  hover: () => tone(523, 0.08, 'sine', 0.015),
  select: () => {
    tone(392, 0.16, 'sine', 0.05);
    tone(523, 0.2, 'sine', 0.04, undefined, 0.06);
  },
  deselect: () => tone(440, 0.18, 'sine', 0.04, 330),
  flip: () => whoosh(0.2, 0.12, 500),
  play: () => {
    whoosh(0.26, 0.14, 420);
    tone(147, 0.28, 'sine', 0.08, 110);
  },
  deny: () => tone(196, 0.22, 'sine', 0.05, 165),
  coin: () => {
    tone(659, 0.14, 'sine', 0.04);
    tone(988, 0.24, 'sine', 0.035, undefined, 0.07);
  },
  /** Taking the table: a low, muffled thud. */
  hit: () => {
    whoosh(0.18, 0.12, 300);
    tone(110, 0.32, 'sine', 0.09, 70);
  },
  /** A booster pack tearing open. */
  tear: () => {
    whoosh(0.35, 0.16, 900);
    tone(220, 0.2, 'sine', 0.04, 330);
  },
  /** Card flips in a pack, by rarity. */
  reveal: () => tone(523, 0.12, 'sine', 0.04),
  revealRare: () => {
    tone(659, 0.16, 'triangle', 0.05);
    tone(988, 0.22, 'triangle', 0.04, undefined, 0.06);
  },
  revealLegendary: () => {
    tone(523, 0.18, 'triangle', 0.05);
    tone(659, 0.18, 'triangle', 0.05, undefined, 0.08);
    tone(784, 0.2, 'triangle', 0.05, undefined, 0.16);
    tone(1047, 0.34, 'triangle', 0.05, undefined, 0.24);
  },
  /** Winning a fight: a short rising arpeggio. */
  win: () => {
    tone(392, 0.2, 'sine', 0.045);
    tone(523, 0.2, 'sine', 0.045, undefined, 0.1);
    tone(659, 0.32, 'sine', 0.045, undefined, 0.2);
  },
} as const;

export type SoundName = keyof typeof SOUNDS;

export function playSound(name: SoundName, enabled: boolean): void {
  if (enabled) SOUNDS[name]();
}

/** Scoring ticks climb a semitone per step, up to an octave. */
const TICK_BASE_HZ = 392;
const TICK_MAX_STEPS = 12;

export function tickFrequency(step: number): number {
  return TICK_BASE_HZ * 2 ** (Math.min(step, TICK_MAX_STEPS) / 12);
}

/** One scoring beat; a «×» step rings a brighter two-note chime. */
export function playScoreTick(step: number, times: boolean, enabled: boolean): void {
  if (!enabled) return;
  const freq = tickFrequency(step);
  if (times) {
    tone(freq, 0.22, 'triangle', 0.06);
    tone(freq * 1.5, 0.26, 'triangle', 0.05, undefined, 0.05);
  } else {
    tone(freq, 0.1, 'sine', 0.045);
  }
}

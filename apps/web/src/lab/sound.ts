/** Soft WebAudio synth: rounded waves, a low-pass "felt" filter and gentle envelopes — no audio files. */
let context: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.5;

const ATTACK = 0.008;
const SOFT_CUTOFF = 1800;

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

export const SOUNDS = {
  hover: () => tone(880, 0.05, 'sine', 0.03),
  select: () => {
    tone(523, 0.09, 'triangle', 0.09);
    tone(784, 0.12, 'triangle', 0.08, undefined, 0.05);
  },
  deselect: () => tone(587, 0.1, 'triangle', 0.07, 440),
  flip: () => whoosh(0.16, 0.35, 1400),
  play: () => {
    whoosh(0.22, 0.4, 900);
    tone(196, 0.2, 'sine', 0.14, 130);
  },
  deny: () => tone(220, 0.16, 'triangle', 0.07, 165),
  coin: () => {
    tone(1047, 0.08, 'sine', 0.07);
    tone(1568, 0.16, 'sine', 0.06, undefined, 0.06);
  },
} as const;

export type SoundName = keyof typeof SOUNDS;

export function playSound(name: SoundName, enabled: boolean): void {
  if (enabled) SOUNDS[name]();
}

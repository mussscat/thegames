/** Tiny WebAudio synth: chiptune-style blips and noise bursts, no audio files. */
let context: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch (error) {
    console.warn('WebAudio unavailable', error);
    return null;
  }
}

function blip(freq: number, duration: number, type: OscillatorType, volume: number, slideTo?: number): void {
  const ctx = audio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function noise(duration: number, volume: number, cutoff: number): void {
  const ctx = audio();
  if (!ctx) return;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  gain.gain.value = volume;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();
}

export const SOUNDS = {
  hover: () => blip(1200, 0.03, 'square', 0.03, 1000),
  select: () => {
    blip(523, 0.06, 'square', 0.06);
    window.setTimeout(() => blip(784, 0.09, 'square', 0.06), 55);
  },
  deselect: () => blip(523, 0.07, 'square', 0.05, 392),
  flip: () => noise(0.12, 0.22, 2600),
  play: () => {
    noise(0.2, 0.25, 1400);
    blip(220, 0.18, 'triangle', 0.16, 110);
  },
  deny: () => blip(160, 0.14, 'sawtooth', 0.05, 110),
  coin: () => {
    blip(988, 0.06, 'square', 0.05);
    window.setTimeout(() => blip(1319, 0.12, 'square', 0.05), 60);
  },
} as const;

export type SoundName = keyof typeof SOUNDS;

export function playSound(name: SoundName, enabled: boolean): void {
  if (enabled) SOUNDS[name]();
}

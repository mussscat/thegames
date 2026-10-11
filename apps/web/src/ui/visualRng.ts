/** mulberry32: a tiny seedable generator. Visual randomness must never touch the engine's rng or the game seed. */
export function createVisualRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The app-wide visual generator, seeded once from Math.random (not from the game state). */
export const visualRandom: () => number = createVisualRng(Math.floor(Math.random() * 2 ** 32));

/** One sway phase (seconds of delay) per slot: spread evenly over the period with some jitter, so neighbours never move in step. */
export function swayPhases(count: number, period: number, random: () => number = visualRandom): number[] {
  return Array.from({ length: count }, (_, i) => ((i + random() * 0.6) / count) * period);
}

/** Seeded deterministic RNG (mulberry32). State is an immutable value. */
export type RngState = { readonly seed: number };

const UINT32_RANGE = 4294967296;
const MULBERRY_INCREMENT = 0x6d2b79f5;

export function createRng(seed: number): RngState {
  return { seed: seed >>> 0 };
}

export function nextFloat(state: RngState): readonly [number, RngState] {
  const nextSeed = (state.seed + MULBERRY_INCREMENT) >>> 0;
  let t = nextSeed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
  return [value, { seed: nextSeed }];
}

export function nextInt(state: RngState, maxExclusive: number): readonly [number, RngState] {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError(`maxExclusive must be a positive integer, got ${maxExclusive}`);
  }
  const [value, next] = nextFloat(state);
  return [Math.floor(value * maxExclusive), next];
}

/** Fisher–Yates over a fresh copy; the input array is never touched. */
export function shuffle<T>(items: readonly T[], state: RngState): readonly [readonly T[], RngState] {
  const result = [...items];
  let rng = state;
  for (let i = result.length - 1; i > 0; i--) {
    const [j, next] = nextInt(rng, i + 1);
    rng = next;
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return [result, rng];
}

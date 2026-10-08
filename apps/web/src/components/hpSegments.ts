/** Bars stay readable at any HP: at most this many segments. */
const MAX_SEGMENTS = 10;

/** Fill (0..1) of each HP segment; big pools split into 10 equal shares, the boundary segment partly filled. */
export function hpSegments(hp: number, max: number): readonly number[] {
  if (max <= 0) return [];
  const count = Math.min(max, MAX_SEGMENTS);
  const share = max / count;
  const left = Math.min(max, Math.max(0, hp));
  return Array.from({ length: count }, (_, i) => Math.min(1, Math.max(0, (left - i * share) / share)));
}

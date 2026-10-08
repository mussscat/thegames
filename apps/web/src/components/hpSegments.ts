/** One segment per max HP; the first `hp` are filled. */
export function hpSegments(hp: number, max: number): readonly boolean[] {
  const total = Math.max(0, max);
  const filled = Math.min(total, Math.max(0, hp));
  return Array.from({ length: total }, (_, i) => i < filled);
}

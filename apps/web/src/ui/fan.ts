const MAX_STEP_DEG = 6;
const MAX_SPREAD_DEG = 12;
const MAX_DROP_PX = 8;

function offset(index: number, count: number): number {
  return index - (count - 1) / 2;
}

/** Rotation of a card in a fanned hand; the whole fan never exceeds ±12°. */
export function fanAngle(index: number, count: number): number {
  if (count <= 1) return 0;
  const step = Math.min(MAX_STEP_DEG, (MAX_SPREAD_DEG * 2) / (count - 1));
  return offset(index, count) * step;
}

/** How far a card sits below the middle one, so the fan follows an arc. */
export function fanDrop(index: number, count: number): number {
  if (count <= 1) return 0;
  const t = offset(index, count) / ((count - 1) / 2);
  return Math.round(t * t * MAX_DROP_PX);
}

/** Fraction of a card width each card hides under the next, so `count` cards fit in `fit` widths. */
export function handOverlap(count: number, fit = 6.5): number {
  if (count <= Math.floor(fit)) return 0;
  return 1 - (fit - 1) / (count - 1);
}

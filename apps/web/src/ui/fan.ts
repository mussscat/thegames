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

export type FanSlot = { readonly x: number; readonly y: number; readonly angle: number };

/** Room kept at each end for the rotation of the outer cards, as a fraction of a card width. */
const ROTATION_ROOM = 0.2;

/**
 * Where each card of a hand sits relative to the middle of the hand: `x` px from the centre, `y` px down, `angle` degrees.
 * Cards keep a small gap when they fit and overlap just enough to stay inside `width` when they do not.
 */
export function handLayout(count: number, width: number, cardWidth: number, gap = 4): readonly FanSlot[] {
  if (count <= 0) return [];
  const room = Math.max(0, width - cardWidth - cardWidth * ROTATION_ROOM * 2);
  const step = count <= 1 ? 0 : Math.min(cardWidth + gap, room / (count - 1));
  return Array.from({ length: count }, (_, i) => ({ x: (i - (count - 1) / 2) * step, y: fanDrop(i, count), angle: fanAngle(i, count) }));
}

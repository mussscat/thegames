import type { PlayerId, TakePreview } from '@game/durak';

export type CounterView = {
  /** Who would take the hit; null while there is nothing to show. */
  readonly taker: PlayerId | null;
  readonly label: string;
  readonly chips: string;
  readonly mult: string;
  readonly damage: string;
};

/** Whole numbers as they are, fractions to at most two places without trailing zeros; cuts binary noise. */
function show(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** The counter's texts: what taking the table now would score and who it hurts. */
export function counterView(preview: TakePreview | null): CounterView {
  if (!preview) return { taker: null, label: '', chips: '0', mult: '1', damage: '0' };
  return {
    taker: preview.taker,
    label: preview.taker === 'player' ? 'Удар по тебе' : 'Удар по сопернику',
    chips: show(preview.chips),
    mult: show(preview.mult),
    damage: show(preview.damage),
  };
}

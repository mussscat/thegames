import type { Hit, PlayerId, ScoredHit } from '@game/durak';

const formatMult = (mult: number): string => String(Math.round(mult * 100) / 100);

export function hitText(hit: Hit, lastScore: ScoredHit | null = null): string {
  return lastScore && lastScore.target === hit.target && lastScore.damage === hit.amount
    ? `−${hit.amount} · ${lastScore.chips} × ${formatMult(lastScore.mult)}`
    : `−${hit.amount}`;
}

/** Label for the hit a side took from the last action, or null if none. */
export function hitLabelFor(hits: readonly Hit[], target: PlayerId, lastScore: ScoredHit | null = null): string | null {
  const own = hits.filter((hit) => hit.target === target);
  return own.length > 0 ? own.map((hit) => hitText(hit, lastScore)).join(', ') : null;
}

import type { Hit, PlayerId, ScoredHit } from '@game/durak';

/** What the HP bar pops: the damage, and the Balatro-style chips × mult it came from when it was scored. */
export type HitInfo = { readonly damage: number; readonly chips: number | null; readonly mult: number | null };

export function formatMult(mult: number): string {
  return String(Math.round(mult * 100) / 100);
}

/** The hit a side took from the last action, or null if none. */
export function hitInfoFor(hits: readonly Hit[], target: PlayerId, lastScore: ScoredHit | null): HitInfo | null {
  const damage = hits.filter((hit) => hit.target === target).reduce((sum, hit) => sum + hit.amount, 0);
  if (damage === 0) return null;
  const scored = lastScore && lastScore.target === target && lastScore.damage === damage;
  return { damage, chips: scored ? lastScore.chips : null, mult: scored ? lastScore.mult : null };
}

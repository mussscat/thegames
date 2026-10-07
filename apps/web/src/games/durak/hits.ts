import type { Hit, PlayerId } from '@game/durak';

export function hitText(hit: Hit): string {
  return `−${hit.amount} взял`;
}

/** Label for the hit a side took from the last action, or null if none. */
export function hitLabelFor(hits: readonly Hit[], target: PlayerId): string | null {
  const own = hits.filter((hit) => hit.target === target);
  return own.length > 0 ? own.map(hitText).join(', ') : null;
}

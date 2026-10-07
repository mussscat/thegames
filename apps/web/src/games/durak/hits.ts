import type { Hit, PlayerId } from '@game/durak';

const REASON_LABELS: Readonly<Record<Hit['reason'], string>> = {
  took: 'взял',
  durak: 'дурак',
};

export function hitText(hit: Hit): string {
  return `−${hit.amount} ${REASON_LABELS[hit.reason]}`;
}

/** Combined label for all hits a side took from the last action, or null if none. */
export function hitLabelFor(hits: readonly Hit[], target: PlayerId): string | null {
  const own = hits.filter((hit) => hit.target === target);
  return own.length > 0 ? own.map(hitText).join(', ') : null;
}

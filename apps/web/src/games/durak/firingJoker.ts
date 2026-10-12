import type { ScoreTarget, TimelineEvent } from './scoreTimeline';

const playerSlot = (target: ScoreTarget): number | null => (target.kind === 'joker' && target.side === 'player' ? target.slot : null);

/** The player joker the current scoring beat is about: it jumps out of the stack while the beat lasts. */
export function firingJoker(event: TimelineEvent | null): number | null {
  if (!event) return null;
  return playerSlot(event.pop) ?? event.bounce.map(playerSlot).find((slot) => slot !== null) ?? null;
}

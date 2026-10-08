import type { FightState, RoundState } from '@game/durak';
import type { SoundName } from '../../ui/sound';

function cardsOnTable(round: RoundState): number {
  return round.table.reduce((sum, pair) => sum + (pair.defense ? 2 : 1), 0);
}

/** The one sound a fight state change makes, most important first. */
export function fightSound(prev: FightState, next: FightState): SoundName | null {
  if (next.winner && !prev.winner) return next.winner === 'player' ? 'win' : 'hit';
  if (next.hitSeq > prev.hitSeq) return 'hit';
  if (next.roundNumber > prev.roundNumber) return 'flip';
  const before = cardsOnTable(prev.round);
  const after = cardsOnTable(next.round);
  if (after > before) return 'play';
  if (before > 0 && after === 0) return 'flip';
  return null;
}

export function coinSound(prev: number, next: number): SoundName | null {
  return prev === next ? null : 'coin';
}

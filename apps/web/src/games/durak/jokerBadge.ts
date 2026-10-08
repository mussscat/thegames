import { SERIAL_STEP, type JokerId, type JokerState } from '@game/durak';

function counter(id: JokerId, state: JokerState, enemyTakes: number): number {
  if (id === 'rage') return state.rage;
  if (id === 'cleanHands') return state.cleanStreak;
  if (id === 'collector') return state.collected;
  if (id === 'serial') return SERIAL_STEP * enemyTakes;
  return 0;
}

/** A live counter for jokers that charge or grow; null when there is nothing to show. */
export function jokerBadge(id: JokerId, state: JokerState, enemyTakes: number): string | null {
  const value = counter(id, state, enemyTakes);
  if (value <= 0) return null;
  return id === 'rage' ? `заряд +${value}` : `+${value} множ.`;
}

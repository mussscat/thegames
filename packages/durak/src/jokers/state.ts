import { countJoker, RAGE_CHARGE, type JokerId } from './catalog';
import type { TakenCard } from './score';

/** Joker memory of one side: Копилка ярости charge, Чистюля streak, Коллекционер growth (run-wide). */
export type JokerState = { readonly rage: number; readonly cleanStreak: number; readonly collected: number };

export const EMPTY_JOKER_STATE: JokerState = { rage: 0, cleanStreak: 0, collected: 0 };

/** The side defended and the bout ended in «Бито». */
export function afterBeaten(state: JokerState, jokers: readonly JokerId[]): JokerState {
  const gain = RAGE_CHARGE * countJoker(jokers, 'rage');
  return gain > 0 ? { ...state, rage: state.rage + gain } : state;
}

/** The side's attack was taken and scored: the charge is spent, Коллекционер grows. */
export function afterHitDealt(state: JokerState, jokers: readonly JokerId[], taken: readonly TakenCard[]): JokerState {
  const enhanced = taken.filter((card) => card.enhancement !== null).length;
  return { ...state, rage: 0, collected: state.collected + enhanced * countJoker(jokers, 'collector') };
}

export function afterOwnTake(state: JokerState): JokerState {
  return { ...state, cleanStreak: 0 };
}

export function afterRound(state: JokerState, jokers: readonly JokerId[], tookThisRound: boolean): JokerState {
  const gain = countJoker(jokers, 'cleanHands');
  return tookThisRound || gain === 0 ? state : { ...state, cleanStreak: state.cleanStreak + gain };
}

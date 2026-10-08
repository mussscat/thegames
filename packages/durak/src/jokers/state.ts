import { countJoker, RAGE_CHARGE, type JokerId } from './catalog';
import type { TakenCard } from './score';

/** Joker memory of one side: Копилка ярости charge, Чистюля streak, Коллекционер growth (run-wide). */
export type JokerState = { readonly rage: number; readonly cleanStreak: number; readonly collected: number };

export const EMPTY_JOKER_STATE: JokerState = { rage: 0, cleanStreak: 0, collected: 0 };

/**
 * State holds one joker's worth: every slot acting as that joker (Зеркало copies included) reads it when scoring,
 * so events add a single step here — never once per copy.
 */
const has = (jokers: readonly JokerId[], id: JokerId): boolean => countJoker(jokers, id) > 0;

/** The side defended and the bout ended in «Бито». */
export function afterBeaten(state: JokerState, jokers: readonly JokerId[]): JokerState {
  return has(jokers, 'rage') ? { ...state, rage: state.rage + RAGE_CHARGE } : state;
}

/** The side's attack was taken and scored: the charge is spent, Коллекционер grows. */
export function afterHitDealt(state: JokerState, jokers: readonly JokerId[], taken: readonly TakenCard[]): JokerState {
  const enhanced = taken.filter((card) => card.enhancement !== null).length;
  return { ...state, rage: 0, collected: state.collected + (has(jokers, 'collector') ? enhanced : 0) };
}

export function afterOwnTake(state: JokerState): JokerState {
  return { ...state, cleanStreak: 0 };
}

export function afterRound(state: JokerState, jokers: readonly JokerId[], tookThisRound: boolean): JokerState {
  return tookThisRound || !has(jokers, 'cleanHands') ? state : { ...state, cleanStreak: state.cleanStreak + 1 };
}

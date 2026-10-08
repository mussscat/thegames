import { SUITS, type Card } from '@game/core';

export const RANK_ORDERS = ['asc', 'desc'] as const;
export const TRUMP_PLACES = ['first', 'last', 'mixed'] as const;

/** Three independent choices (owner-specified): group by suit, rank direction, and where trumps go. */
export type HandSort = {
  readonly bySuit: boolean;
  readonly rank: (typeof RANK_ORDERS)[number];
  /** `mixed`: trumps are not a separate group and sort like any other card. */
  readonly trumps: (typeof TRUMP_PLACES)[number];
};

export const DEFAULT_HAND_SORT: HandSort = { bySuit: true, rank: 'asc', trumps: 'last' };

type Compare = (a: Card, b: Card) => number;

function comparator({ bySuit, rank }: HandSort): Compare {
  const dir = rank === 'asc' ? 1 : -1;
  const suitDiff: Compare = (a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
  return bySuit ? (a, b) => suitDiff(a, b) || dir * (a.rank - b.rank) : (a, b) => dir * (a.rank - b.rank || suitDiff(a, b));
}

/** Trumps follow the round's rules (boss trumps and Козырная included) via `isTrump`. Returns a new array. */
export function sortHand(cards: readonly Card[], sort: HandSort, isTrump: (card: Card) => boolean): readonly Card[] {
  const compare = comparator(sort);
  if (sort.trumps === 'mixed') return [...cards].sort(compare);
  const trumps = cards.filter(isTrump).sort(compare);
  const rest = cards.filter((card) => !isTrump(card)).sort(compare);
  return sort.trumps === 'first' ? [...trumps, ...rest] : [...rest, ...trumps];
}

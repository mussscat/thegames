import { SUITS, type Card } from '@game/core';

export const HAND_SORTS = ['deal', 'suit', 'rank', 'trumpsFirst'] as const;

export type HandSort = (typeof HAND_SORTS)[number];

type Compare = (a: Card, b: Card) => number;

const byRank: Compare = (a, b) => a.rank - b.rank || SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
const bySuit: Compare = (a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || a.rank - b.rank;

/** Trumps (as the round defines them — boss rules and Козырная included) are kept together at one end. */
export function sortHand(cards: readonly Card[], mode: HandSort, isTrump: (card: Card) => boolean): readonly Card[] {
  if (mode === 'deal') return cards;
  const trumps = cards.filter(isTrump).sort(byRank);
  const rest = cards.filter((card) => !isTrump(card)).sort(mode === 'suit' ? bySuit : byRank);
  return mode === 'trumpsFirst' ? [...trumps, ...rest] : [...rest, ...trumps];
}

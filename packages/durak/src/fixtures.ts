import { createDeck, makeCard, type Card, type Rank, type Suit } from '@game/core';
import { DEFAULT_HAND_SIZES, type RoundState } from './types';

/** Test helpers. Not for production code. */
export const c = (rank: Rank, suit: Suit): Card => makeCard(suit, rank);

/** Up to 9 distinct cards of one suit (6..A), used to pad hands. */
export const filler = (count: number, suit: Suit = 'spades'): readonly Card[] =>
  createDeck(6)
    .filter((card) => card.suit === suit)
    .slice(0, count);

export function roundState(overrides: Partial<RoundState> = {}): RoundState {
  return {
    deck: [],
    trumpSuit: 'hearts',
    trumpCard: c(6, 'hearts'),
    hands: { player: [], enemy: [] },
    table: [],
    attacker: 'player',
    defenderTaking: false,
    discardCount: 0,
    outcome: null,
    lastBout: null,
    handSizes: DEFAULT_HAND_SIZES,
    boss: null,
    ...overrides,
  };
}

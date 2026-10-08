import { makeCard, type Card } from '@game/core';
import { describe, expect, it } from 'vitest';
import { DEFAULT_HAND_SORT, sortHand, type HandSort } from './handSort';

const HAND: readonly Card[] = [
  makeCard('hearts', 11),
  makeCard('clubs', 8),
  makeCard('spades', 14),
  makeCard('diamonds', 12),
  makeCard('hearts', 6),
  makeCard('diamonds', 8),
];
const heartsTrump = (card: Card): boolean => card.suit === 'hearts';
const ids = (cards: readonly Card[]): string[] => cards.map((card) => card.id);
const sorted = (sort: Partial<HandSort>, isTrump = heartsTrump): string[] => ids(sortHand(HAND, { ...DEFAULT_HAND_SORT, ...sort }, isTrump));

describe('sortHand', () => {
  it('defaults to suits, low ranks first, trumps last', () => {
    expect(DEFAULT_HAND_SORT).toEqual({ bySuit: true, rank: 'asc', trumps: 'last' });
    expect(sorted({})).toEqual(['clubs-8', 'diamonds-8', 'diamonds-12', 'spades-14', 'hearts-6', 'hearts-11']);
  });

  it('orders high ranks first inside each group', () => {
    expect(sorted({ rank: 'desc' })).toEqual(['clubs-8', 'diamonds-12', 'diamonds-8', 'spades-14', 'hearts-11', 'hearts-6']);
  });

  it('ignores suits when not grouping by suit', () => {
    expect(sorted({ bySuit: false })).toEqual(['clubs-8', 'diamonds-8', 'diamonds-12', 'spades-14', 'hearts-6', 'hearts-11']);
    expect(sorted({ bySuit: false, rank: 'desc' })).toEqual(['spades-14', 'diamonds-12', 'diamonds-8', 'clubs-8', 'hearts-11', 'hearts-6']);
  });

  it('puts trumps first', () => {
    expect(sorted({ trumps: 'first' })).toEqual(['hearts-6', 'hearts-11', 'clubs-8', 'diamonds-8', 'diamonds-12', 'spades-14']);
  });

  it('mixes trumps in with the other cards', () => {
    expect(sorted({ trumps: 'mixed' })).toEqual(['clubs-8', 'diamonds-8', 'diamonds-12', 'hearts-6', 'hearts-11', 'spades-14']);
    expect(sorted({ trumps: 'mixed', bySuit: false })).toEqual(['hearts-6', 'clubs-8', 'diamonds-8', 'hearts-11', 'diamonds-12', 'spades-14']);
  });

  it('treats any card the predicate marks as a trump (witch queens, Козырная)', () => {
    const queensToo = (card: Card): boolean => card.suit === 'hearts' || card.rank === 12;
    expect(sorted({}, queensToo).slice(-3)).toEqual(['diamonds-12', 'hearts-6', 'hearts-11']);
    expect(sorted({ bySuit: false }, queensToo).slice(-3)).toEqual(['hearts-6', 'hearts-11', 'diamonds-12']);
  });

  it('does not mutate the hand', () => {
    const copy = [...HAND];
    sorted({ rank: 'desc' });
    expect(HAND).toEqual(copy);
  });
});

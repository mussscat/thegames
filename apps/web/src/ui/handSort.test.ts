import { makeCard, type Card } from '@game/core';
import { describe, expect, it } from 'vitest';
import { sortHand } from './handSort';

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

describe('sortHand', () => {
  it('keeps the dealt order', () => {
    expect(sortHand(HAND, 'deal', heartsTrump)).toEqual(HAND);
  });

  it('groups by suit, ascending inside, trumps last', () => {
    expect(ids(sortHand(HAND, 'suit', heartsTrump))).toEqual(['clubs-8', 'diamonds-8', 'diamonds-12', 'spades-14', 'hearts-6', 'hearts-11']);
  });

  it('orders by rank with trumps last', () => {
    expect(ids(sortHand(HAND, 'rank', heartsTrump))).toEqual(['clubs-8', 'diamonds-8', 'diamonds-12', 'spades-14', 'hearts-6', 'hearts-11']);
  });

  it('puts trumps first, then the rest by rank', () => {
    expect(ids(sortHand(HAND, 'trumpsFirst', heartsTrump))).toEqual(['hearts-6', 'hearts-11', 'clubs-8', 'diamonds-8', 'diamonds-12', 'spades-14']);
  });

  it('treats any card the predicate marks as a trump (witch queens, Козырная)', () => {
    const queensToo = (card: Card): boolean => card.suit === 'hearts' || card.rank === 12;
    expect(ids(sortHand(HAND, 'rank', queensToo)).slice(-3)).toEqual(['hearts-6', 'hearts-11', 'diamonds-12']);
  });

  it('does not mutate the hand', () => {
    const copy = [...HAND];
    sortHand(HAND, 'suit', heartsTrump);
    expect(HAND).toEqual(copy);
  });
});

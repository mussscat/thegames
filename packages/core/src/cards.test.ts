import { describe, expect, it } from 'vitest';
import { createDeck, isRedSuit, makeCard, rankLabel, SUIT_NAMES, SUIT_SYMBOLS } from './cards';

describe('cards', () => {
  it('makeCard builds a stable id', () => {
    expect(makeCard('hearts', 12)).toEqual({ id: 'hearts-12', suit: 'hearts', rank: 12 });
  });

  it('createDeck() has 52 unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((card) => card.id)).size).toBe(52);
  });

  it('createDeck(6) has 36 cards from six to ace', () => {
    const deck = createDeck(6);
    expect(deck).toHaveLength(36);
    expect(deck.every((card) => card.rank >= 6 && card.rank <= 14)).toBe(true);
  });

  it('rankLabel uses Russian face labels', () => {
    expect(rankLabel(6)).toBe('6');
    expect(rankLabel(10)).toBe('10');
    expect(rankLabel(11)).toBe('В');
    expect(rankLabel(12)).toBe('Д');
    expect(rankLabel(13)).toBe('К');
    expect(rankLabel(14)).toBe('Т');
  });

  it('suit helpers', () => {
    expect(SUIT_SYMBOLS.hearts).toBe('♥');
    expect(SUIT_NAMES.spades).toBe('пики');
    expect(isRedSuit('hearts')).toBe(true);
    expect(isRedSuit('diamonds')).toBe(true);
    expect(isRedSuit('clubs')).toBe(false);
    expect(isRedSuit('spades')).toBe(false);
  });
});

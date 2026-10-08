import { describe, expect, it } from 'vitest';
import { countJoker, effectiveJokers, JOKER_IDS, jokerFightCoins, jokerHandSizes, jokerInterestCap, JOKERS, revealsTopCard } from './catalog';

const PRICE_RANGE = { common: [4, 5], rare: [6, 7], legendary: [9, 10] } as const;

describe('joker catalog', () => {
  it('has 18 jokers with names, rules and prices matching their rarity', () => {
    expect(JOKER_IDS).toHaveLength(18);
    for (const id of JOKER_IDS) {
      const joker = JOKERS[id];
      expect(joker.id).toBe(id);
      expect(joker.name.length).toBeGreaterThan(0);
      expect(joker.description.length).toBeGreaterThan(0);
      const [min, max] = PRICE_RANGE[joker.rarity];
      expect(joker.price, id).toBeGreaterThanOrEqual(min);
      expect(joker.price, id).toBeLessThanOrEqual(max);
    }
  });
});

describe('effectiveJokers', () => {
  it('turns each Зеркало into the joker on its right', () => {
    expect(effectiveJokers(['mirror', 'clubs'])).toEqual(['clubs', 'clubs']);
  });

  it('a Зеркало with nothing or another Зеркало on its right does nothing', () => {
    expect(effectiveJokers(['clubs', 'mirror'])).toEqual(['clubs', null]);
    expect(effectiveJokers(['mirror', 'mirror', 'gloat'])).toEqual([null, 'gloat', 'gloat']);
  });

  it('counts copies made by mirrors', () => {
    expect(countJoker(['mirror', 'rage', 'rage'], 'rage')).toBe(3);
  });
});

describe('rule jokers', () => {
  it('Длинные руки adds a card to its owner hand only', () => {
    expect(jokerHandSizes({ player: ['longArms'], enemy: [] })).toEqual({ player: 7, enemy: 6 });
    expect(jokerHandSizes({ player: [], enemy: ['mirror', 'longArms'] })).toEqual({ player: 6, enemy: 8 });
  });

  it('Шулер reveals the top card', () => {
    expect(revealsTopCard(['cardSharp'])).toBe(true);
    expect(revealsTopCard(['clubs'])).toBe(false);
  });

  it('Копилка raises the interest cap and Мародёр pays for enemy takes', () => {
    expect(jokerInterestCap(['piggyBank'], 5)).toBe(8);
    expect(jokerInterestCap([], 5)).toBe(5);
    expect(jokerFightCoins(['looter'], 4)).toBe(4);
    expect(jokerFightCoins(['clubs'], 4)).toBe(0);
  });
});

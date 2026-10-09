import { createDeck, createRng } from '@game/core';
import { describe, expect, it } from 'vitest';
import {
  conflictFor,
  PACK_SIZE_DEFS,
  packCardRarity,
  rollDeckCard,
  rollPack,
  rollPackCards,
  rollTarotHand,
  TAROT_HAND_SIZE,
  type Pack,
  type PackCard,
} from './packs';

const DECK_IDS = createDeck(6).map((card) => card.id);
const pack = (patch: Partial<Pack>): Pack => ({ kind: 'jokers', size: 'normal', price: 4, ...patch });

describe('rollPack', () => {
  it('prices a pack by its size', () => {
    for (let seed = 0; seed < 50; seed++) {
      const [rolled] = rollPack(createRng(seed));
      expect(rolled.price).toBe(PACK_SIZE_DEFS[rolled.size].price);
    }
  });

  it('follows the kind and size weights roughly', () => {
    const packs = Array.from({ length: 3000 }, (_, seed) => rollPack(createRng(seed))[0]);
    const share = (test: (p: Pack) => boolean) => packs.filter(test).length / packs.length;
    expect(share((p) => p.kind === 'deck')).toBeGreaterThan(0.2);
    expect(share((p) => p.kind === 'deck')).toBeLessThan(0.3);
    expect(share((p) => p.size === 'normal')).toBeGreaterThan(0.65);
    expect(share((p) => p.size === 'mega')).toBeLessThan(0.12);
  });
});

describe('rollPackCards', () => {
  it('fills a pack with as many cards as its size', () => {
    expect(rollPackCards(createRng(1), pack({ size: 'normal' }), [], {})[0]).toHaveLength(3);
    expect(rollPackCards(createRng(1), pack({ size: 'big' }), [], {})[0]).toHaveLength(5);
    expect(rollPackCards(createRng(1), pack({ size: 'mega', kind: 'arcana' }), [], {})[0]).toHaveLength(5);
  });

  it('a joker pack holds different jokers the player does not own', () => {
    for (let seed = 0; seed < 40; seed++) {
      const [cards] = rollPackCards(createRng(seed), pack({ size: 'big' }), ['looter', 'clubs'], {});
      const ids = cards.map((card) => (card.kind === 'joker' ? card.jokerId : 'not a joker'));
      expect(new Set(ids).size).toBe(5);
      expect(ids).not.toContain('looter');
      expect(ids).not.toContain('clubs');
      expect(ids).not.toContain('not a joker');
    }
  });

  it('an arcana pack holds different tarots', () => {
    const [cards] = rollPackCards(createRng(3), pack({ kind: 'arcana', size: 'big' }), [], {});
    expect(cards.every((card) => card.kind === 'tarot')).toBe(true);
    expect(new Set(cards.map((card) => (card.kind === 'tarot' ? card.tarotId : ''))).size).toBe(5);
  });

  it('a deck pack holds different cards, never one the player already has with that enhancement', () => {
    const profile = { 'hearts-14': 'sharp' } as const;
    for (let seed = 0; seed < 60; seed++) {
      const [cards] = rollPackCards(createRng(seed), pack({ kind: 'deck', size: 'big' }), [], profile);
      const deckCards = cards.flatMap((card) => (card.kind === 'card' ? [card] : []));
      expect(deckCards).toHaveLength(5);
      expect(new Set(deckCards.map((card) => card.cardId)).size).toBe(5);
      expect(deckCards.every((card) => DECK_IDS.includes(card.cardId))).toBe(true);
      expect(deckCards.some((card) => card.cardId === 'hearts-14' && card.enhancement === 'sharp')).toBe(false);
    }
  });

  it('is deterministic for a seed', () => {
    expect(rollPackCards(createRng(8), pack({ kind: 'deck' }), [], {})).toEqual(rollPackCards(createRng(8), pack({ kind: 'deck' }), [], {}));
  });
});

describe('rollDeckCard', () => {
  it('returns null when every card is excluded', () => {
    expect(rollDeckCard(createRng(1), {}, DECK_IDS)[0]).toBeNull();
  });
});

describe('rollTarotHand', () => {
  it('deals 5 different cards of the deck', () => {
    const [hand] = rollTarotHand(createRng(2));
    expect(hand).toHaveLength(TAROT_HAND_SIZE);
    expect(new Set(hand).size).toBe(TAROT_HAND_SIZE);
    expect(hand.every((id) => DECK_IDS.includes(id))).toBe(true);
  });
});

describe('conflictFor', () => {
  it('names the enhancement a pick would replace', () => {
    expect(conflictFor({ 'hearts-14': 'sharp' }, 'hearts-14', 'golden')).toBe('sharp');
    expect(conflictFor({ 'hearts-14': 'golden' }, 'hearts-14', 'golden')).toBeNull();
    expect(conflictFor({}, 'hearts-14', 'golden')).toBeNull();
  });
});

describe('packCardRarity', () => {
  it('takes jokers and tarots from their catalogues and enhancements from ENHANCEMENT_RARITY', () => {
    const cards: PackCard[] = [
      { kind: 'joker', jokerId: 'mirror' },
      { kind: 'tarot', tarotId: 'wheel' },
      { kind: 'card', cardId: 'clubs-6', enhancement: 'golden' },
      { kind: 'card', cardId: 'clubs-6', enhancement: 'trump' },
    ];
    expect(cards.map(packCardRarity)).toEqual(['legendary', 'legendary', 'common', 'rare']);
  });
});

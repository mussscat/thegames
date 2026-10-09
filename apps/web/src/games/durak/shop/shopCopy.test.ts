import { rankLabel } from '@game/core';
import { JOKERS } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { cardLabel, cardTipLines, PACK_TEXT, packCardText, packCardTitle, packSizeText, packTipLines, SCORE_HELP } from './shopCopy';

describe('shop copy', () => {
  it('names a deck card by rank and suit', () => {
    expect(cardLabel('hearts-14')).toBe(`${rankLabel(14)}♥`);
    expect(cardLabel('nope')).toBe('nope');
  });

  it('titles each kind of pack card', () => {
    expect(packCardTitle({ kind: 'joker', jokerId: 'looter' })).toBe(JOKERS.looter.name);
    expect(packCardTitle({ kind: 'tarot', tarotId: 'sun' })).toBe('Солнце');
    expect(packCardTitle({ kind: 'card', cardId: 'hearts-14', enhancement: 'golden' })).toBe(`${rankLabel(14)}♥ Золотая`);
  });

  it('describes a pack card by its catalogue text', () => {
    expect(packCardText({ kind: 'tarot', tarotId: 'hermit' })).toBe('Удваивает монеты (не больше +10)');
  });

  it('says how many cards a pack holds and how many to take', () => {
    expect(packSizeText('normal')).toBe('3 карты · бери 1');
    expect(packSizeText('big')).toBe('5 карт · бери 1');
    expect(packSizeText('mega')).toBe('5 карт · бери 2');
  });
});

describe('tip lines', () => {
  it('a scoring joker explains how a hit is counted', () => {
    const lines = cardTipLines({ kind: 'joker', jokerId: 'hearts' }, {});
    expect(lines[0]).toMatchObject({ name: JOKERS.hearts.name, description: JOKERS.hearts.description });
    expect(lines.at(-1)).toEqual(SCORE_HELP);
  });

  it('a non-scoring joker has no scoring help', () => {
    expect(cardTipLines({ kind: 'joker', jokerId: 'looter' }, {})).toHaveLength(1);
  });

  it('a shelf card warns when it would replace another enhancement', () => {
    const lines = cardTipLines({ kind: 'card', cardId: 'hearts-14', enhancement: 'golden' }, { 'hearts-14': 'sharp' });
    expect(lines.at(-1)?.description).toBe('В колоде: Острая → станет Золотая');
  });

  it('a pack names its kind and size', () => {
    expect(packTipLines({ kind: 'arcana', size: 'big', price: 6 })).toEqual([{ name: 'Таро', owner: 'Большой · 5 карт · бери 1', description: PACK_TEXT.arcana }]);
  });
});

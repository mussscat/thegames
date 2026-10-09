import { rankLabel } from '@game/core';
import { JOKERS } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { cardLabel, packCardText, packCardTitle, packSizeText } from './shopCopy';

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

import { makeCard } from '@game/core';
import type { CardScore } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { strikeTip } from './strikeTips';

const card = makeCard('clubs', 7);

describe('strikeTip', () => {
  it('names the total and lists every bonus', () => {
    const score: CardScore = {
      chips: 6,
      parts: [
        { source: { kind: 'card', card }, chips: 1 },
        { source: { kind: 'enhancement', card, enhancement: 'golden' }, chips: 3 },
        { source: { kind: 'joker', side: 'attacker', slot: 0, joker: 'small', acting: 'small' }, chips: 2 },
      ],
    };
    expect(strikeTip(score, null)).toEqual({ name: '+6 фишек', description: 'ранг +1 · Золотая +3 · Мелочь +2', owner: null });
  });

  it('a mirror is named after the joker it copies', () => {
    const score: CardScore = { chips: 3, parts: [{ source: { kind: 'joker', side: 'attacker', slot: 0, joker: 'mirror', acting: 'clubs' }, chips: 3 }] };
    expect(strikeTip(score, null).description).toBe('Трефовик +3');
  });

  it('agrees the noun with the number', () => {
    const one: CardScore = { chips: 1, parts: [{ source: { kind: 'card', card }, chips: 1 }] };
    const two: CardScore = { chips: 2, parts: [{ source: { kind: 'card', card }, chips: 2 }] };
    const five: CardScore = { chips: 21, parts: [] };
    expect([strikeTip(one, null).name, strikeTip(two, null).name, strikeTip(five, null).name]).toEqual(['+1 фишка', '+2 фишки', '+21 фишка']);
  });

  it('carries the owner note for a split card', () => {
    expect(strikeTip({ chips: 1, parts: [] }, 'твоё').owner).toBe('твоё');
  });
});

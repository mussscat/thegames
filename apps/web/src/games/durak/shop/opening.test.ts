import { describe, expect, it } from 'vitest';
import { canTake, castsWheelNow, replacementsFor, revealSchedule } from './opening';

const FULL = ['clubs', 'hearts', 'spades', 'diamonds', 'small'] as const;

describe('revealSchedule', () => {
  it('tears the pack, then flips one card after another', () => {
    expect(revealSchedule(3, 1, false)).toEqual({ cardsAt: 600, flips: [600, 850, 1100], done: 1400 });
  });
  it('divides every time by the speed', () => {
    const plan = revealSchedule(2, 2, false);
    expect(plan.cardsAt).toBe(300);
    expect(plan.flips).toEqual([300, 425]);
    expect(plan.done).toBe(575);
  });
  it('shows everything at once with reduced motion', () => {
    expect(revealSchedule(5, 1, true)).toEqual({ cardsAt: 0, flips: [0, 0, 0, 0, 0], done: 0 });
  });
});

describe('replacementsFor', () => {
  it('warns when a deck card would replace another enhancement', () => {
    expect(replacementsFor({ kind: 'card', cardId: 'hearts-14', enhancement: 'golden' }, [], { 'hearts-14': 'sharp' })).toEqual([
      { cardId: 'hearts-14', from: 'sharp', to: 'golden' },
    ]);
    expect(replacementsFor({ kind: 'card', cardId: 'hearts-14', enhancement: 'golden' }, [], {})).toEqual([]);
  });
  it('lists every differently enhanced target of an enhancement tarot', () => {
    expect(replacementsFor({ kind: 'tarot', tarotId: 'sun' }, ['a', 'b'], { a: 'coin', b: 'golden' })).toEqual([{ cardId: 'a', from: 'coin', to: 'golden' }]);
  });
  it('warns when Смерть overwrites the first card', () => {
    expect(replacementsFor({ kind: 'tarot', tarotId: 'death' }, ['a', 'b'], { a: 'coin', b: 'trump' })).toEqual([{ cardId: 'a', from: 'coin', to: 'trump' }]);
  });
  it('never warns for jokers or tarots without targets', () => {
    expect(replacementsFor({ kind: 'joker', jokerId: 'looter' }, [], {})).toEqual([]);
    expect(replacementsFor({ kind: 'tarot', tarotId: 'hermit' }, [], { a: 'coin' })).toEqual([]);
  });
});

describe('canTake', () => {
  it('needs a free slot for a joker', () => {
    expect(canTake({ kind: 'joker', jokerId: 'looter' }, [], {}, [])).toBe(true);
    expect(canTake({ kind: 'joker', jokerId: 'looter' }, [], {}, FULL)).toBe(false);
  });
  it('needs valid targets for a tarot', () => {
    expect(canTake({ kind: 'tarot', tarotId: 'sun' }, [], {}, [])).toBe(false);
    expect(canTake({ kind: 'tarot', tarotId: 'sun' }, ['a'], {}, [])).toBe(true);
    expect(canTake({ kind: 'tarot', tarotId: 'death' }, ['a', 'b'], {}, [])).toBe(false);
    expect(canTake({ kind: 'tarot', tarotId: 'hermit' }, [], {}, [])).toBe(true);
  });
  it('always takes a deck card', () => {
    expect(canTake({ kind: 'card', cardId: 'a', enhancement: 'golden' }, [], {}, FULL)).toBe(true);
  });
});

describe('castsWheelNow', () => {
  const wheel = { card: { kind: 'tarot', tarotId: 'wheel' }, price: 3 } as const;
  it('is true only for an affordable shelf Колесо Фортуны in a free shop', () => {
    expect(castsWheelNow(wheel, 3, false)).toBe(true);
    expect(castsWheelNow(wheel, 2, false)).toBe(false);
    expect(castsWheelNow(wheel, 9, true)).toBe(false);
    expect(castsWheelNow({ card: { kind: 'tarot', tarotId: 'sun' }, price: 3 }, 9, false)).toBe(false);
    expect(castsWheelNow(null, 9, false)).toBe(false);
  });
});

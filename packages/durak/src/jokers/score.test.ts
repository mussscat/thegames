import { makeCard, type Card, type Rank, type Suit } from '@game/core';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { EnhancementId } from '../enhancements';
import type { JokerId } from './catalog';
import { scoreTake, type ScoreInput, type TakenCard } from './score';
import { EMPTY_JOKER_STATE, type JokerState } from './state';

const c = (rank: Rank, suit: Suit): Card => makeCard(suit, rank);
const t = (card: Card, enhancement: EnhancementId | null = null): TakenCard => ({ card, enhancement });

function input(taken: readonly TakenCard[], over: Partial<ScoreInput> = {}, attacker: readonly JokerId[] = [], state: Partial<JokerState> = {}): ScoreInput {
  return {
    taken,
    trumpSuit: 'hearts',
    boss: null,
    topCard: null,
    takerPriorTakes: 0,
    baseMult: 1,
    attacker: { jokers: attacker, state: { ...EMPTY_JOKER_STATE, ...state } },
    defender: { jokers: [], state: EMPTY_JOKER_STATE },
    ...over,
  };
}

const damage = (i: ScoreInput): number => scoreTake(i).damage;
const side = (jokers: readonly JokerId[]) => ({ jokers, state: EMPTY_JOKER_STATE });

describe('base scoring', () => {
  it('scores rank chips: 6–10 → 1, В–К → 2, Т → 3', () => {
    expect(damage(input([t(c(7, 'clubs')), t(c(7, 'spades'))]))).toBe(2);
    expect(damage(input([t(c(6, 'clubs')), t(c(11, 'clubs')), t(c(14, 'clubs'))]))).toBe(6);
  });

  it('Золотая adds 3 chips and Острая adds 1 mult', () => {
    expect(damage(input([t(c(7, 'clubs'), 'golden')]))).toBe(4);
    expect(damage(input([t(c(7, 'clubs'), 'sharp'), t(c(8, 'clubs'))]))).toBe(4);
  });

  it('applies the tier multiplier first', () => {
    const score = scoreTake(input([t(c(7, 'clubs'))], { baseMult: 3 }));
    expect(score.damage).toBe(3);
    expect(score.steps[0]?.source).toEqual({ kind: 'tier' });
  });

  it('logs every effective step with running totals and skips neutral ones', () => {
    const score = scoreTake(input([t(c(7, 'clubs'), 'golden')], {}, ['gloat']));
    expect(score.steps.map((step) => [step.effect, step.chips, step.mult])).toEqual([
      [{ kind: 'chips', value: 1 }, 1, 1],
      [{ kind: 'chips', value: 3 }, 4, 1],
    ]);
  });
});

describe('jokers', () => {
  it('suit jokers add chips per matching card; Мелочь per card 6–8', () => {
    expect(damage(input([t(c(7, 'clubs')), t(c(8, 'spades'))], {}, ['clubs']))).toBe(5);
    expect(damage(input([t(c(8, 'clubs')), t(c(9, 'clubs'))], {}, ['small']))).toBe(4);
  });

  it('order matters: +mult before ×mult beats the reverse', () => {
    const taken = [t(c(7, 'clubs')), t(c(8, 'clubs')), t(c(9, 'hearts'))];
    expect(damage(input(taken, {}, ['gloat', 'trumpAce']))).toBe(18);
    expect(damage(input(taken, {}, ['trumpAce', 'gloat']))).toBe(12);
  });

  it('Козырной туз counts Козырная cards and boss trumps', () => {
    expect(damage(input([t(c(7, 'clubs'), 'trump')], {}, ['trumpAce']))).toBe(2);
    expect(damage(input([t(c(12, 'clubs'))], { boss: 'witch' }, ['trumpAce']))).toBe(4);
    expect(damage(input([t(c(7, 'clubs'))], {}, ['trumpAce']))).toBe(1);
  });

  it('Зеркало copies the joker on its right, once', () => {
    expect(damage(input([t(c(7, 'clubs'))], {}, ['mirror', 'clubs']))).toBe(7);
    expect(damage(input([t(c(7, 'clubs'))], {}, ['clubs', 'mirror']))).toBe(4);
    expect(damage(input([t(c(7, 'clubs'))], {}, ['mirror', 'mirror', 'clubs']))).toBe(7);
  });

  it('Копилка ярости spends its charge; Серийный grows with prior takes', () => {
    expect(damage(input([t(c(7, 'clubs'))], {}, ['rage'], { rage: 8 }))).toBe(9);
    expect(damage(input([t(c(7, 'clubs')), t(c(8, 'clubs'))], { takerPriorTakes: 2 }, ['serial']))).toBe(4);
  });

  it('Шулер adds mult when a taken card matches the open top card', () => {
    expect(damage(input([t(c(7, 'clubs'))], { topCard: c(7, 'diamonds') }, ['cardSharp']))).toBe(2);
    expect(damage(input([t(c(7, 'clubs'))], { topCard: c(8, 'diamonds') }, ['cardSharp']))).toBe(1);
  });

  it('Чистюля and Коллекционер add their accumulated mult', () => {
    expect(damage(input([t(c(7, 'clubs'))], {}, ['cleanHands'], { cleanStreak: 2 }))).toBe(3);
    expect(damage(input([t(c(7, 'clubs'))], {}, ['collector'], { collected: 4 }))).toBe(5);
  });

  it('the taker defensive jokers apply last; fractional multipliers floor exactly', () => {
    const two = [t(c(7, 'clubs')), t(c(8, 'clubs'))];
    expect(damage(input(two, { defender: side(['usurer']) }))).toBe(3);
    expect(damage(input(two, { defender: side(['thickSkin']) }))).toBe(1);
    expect(damage(input([...two, t(c(9, 'clubs'))], {}, ['thickSkin']))).toBe(2);
    expect(damage(input(two, {}, ['usurer']))).toBe(3);
  });
});

describe('scoring properties', () => {
  const ranks = fc.constantFrom<Rank>(6, 7, 8, 9, 10, 11, 12, 13, 14);
  const suits = fc.constantFrom<Suit>('clubs', 'diamonds', 'hearts', 'spades');
  const takens = fc.array(fc.tuple(ranks, suits), { minLength: 1, maxLength: 6 }).map((cards) => cards.map(([r, s]) => t(c(r, s))));

  it('without jokers damage equals the summed rank chips (never negative)', () => {
    fc.assert(
      fc.property(takens, (taken) => {
        const expected = taken.reduce((sum, { card }) => sum + (card.rank === 14 ? 3 : card.rank >= 11 ? 2 : 1), 0);
        expect(damage(input(taken))).toBe(expected);
      }),
    );
  });

  it('swapping two chips-only jokers does not change the result', () => {
    fc.assert(
      fc.property(takens, (taken) => {
        expect(damage(input(taken, {}, ['hearts', 'small']))).toBe(damage(input(taken, {}, ['small', 'hearts'])));
      }),
    );
  });
});

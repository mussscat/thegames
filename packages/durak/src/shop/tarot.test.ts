import { createRng } from '@game/core';
import { describe, expect, it } from 'vitest';
import { MAX_JOKERS } from '../jokers/catalog';
import { applyTarot, HERMIT_CAP, TAROT_IDS, TAROTS, targetsOk, type TarotSubject } from './tarot';

const subject = (patch: Partial<TarotSubject> = {}): TarotSubject => ({ coins: 7, jokers: [], profile: {}, rng: createRng(1), ...patch });
const FULL = ['clubs', 'hearts', 'spades', 'diamonds', 'small'] as const;

function expectOk<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

describe('tarot catalogue', () => {
  it('has the 8 tarots with the rarities of the spec', () => {
    expect(TAROT_IDS).toHaveLength(8);
    expect(TAROT_IDS.filter((id) => TAROTS[id].rarity === 'common')).toEqual(['sun', 'tower', 'star', 'chariot', 'emperor']);
    expect(TAROTS.death.rarity).toBe('rare');
    expect(TAROTS.hermit.rarity).toBe('rare');
    expect(TAROTS.wheel.rarity).toBe('legendary');
  });
});

describe('enhancement tarots', () => {
  it('Солнце makes up to 2 cards Золотые, replacing what was there', () => {
    const out = expectOk(applyTarot(subject({ profile: { 'clubs-7': 'sharp' } }), 'sun', ['clubs-7', 'hearts-9']));
    expect(out.profile).toEqual({ 'clubs-7': 'golden', 'hearts-9': 'golden' });
    expect(out.coins).toBe(7);
  });

  it('Башня, Звезда, Колесница and Император give their enhancements', () => {
    expect(expectOk(applyTarot(subject(), 'tower', ['clubs-7'])).profile).toEqual({ 'clubs-7': 'sharp' });
    expect(expectOk(applyTarot(subject(), 'star', ['clubs-7'])).profile).toEqual({ 'clubs-7': 'coin' });
    expect(expectOk(applyTarot(subject(), 'chariot', ['clubs-7'])).profile).toEqual({ 'clubs-7': 'heavy' });
    expect(expectOk(applyTarot(subject(), 'emperor', ['clubs-7'])).profile).toEqual({ 'clubs-7': 'trump' });
  });

  it('refuses too many, too few or repeated targets', () => {
    expect(applyTarot(subject(), 'sun', ['a', 'b', 'c'])).toEqual({ ok: false, error: 'badTargets' });
    expect(applyTarot(subject(), 'sun', [])).toEqual({ ok: false, error: 'badTargets' });
    expect(applyTarot(subject(), 'sun', ['a', 'a'])).toEqual({ ok: false, error: 'badTargets' });
    expect(applyTarot(subject(), 'chariot', ['a', 'b'])).toEqual({ ok: false, error: 'badTargets' });
  });
});

describe('Смерть', () => {
  it('gives the first card the enhancement of the second', () => {
    const out = expectOk(applyTarot(subject({ profile: { 'hearts-14': 'trump' } }), 'death', ['clubs-6', 'hearts-14']));
    expect(out.profile).toEqual({ 'hearts-14': 'trump', 'clubs-6': 'trump' });
  });

  it('needs an enhanced second card', () => {
    expect(targetsOk('death', ['clubs-6', 'hearts-14'], {})).toBe(false);
    expect(applyTarot(subject(), 'death', ['clubs-6', 'hearts-14'])).toEqual({ ok: false, error: 'badTargets' });
  });
});

describe('Отшельник', () => {
  it('doubles the coins', () => {
    expect(expectOk(applyTarot(subject({ coins: 7 }), 'hermit', [])).coins).toBe(14);
  });

  it('adds at most HERMIT_CAP', () => {
    expect(expectOk(applyTarot(subject({ coins: 30 }), 'hermit', [])).coins).toBe(30 + HERMIT_CAP);
  });

  it('takes no targets', () => {
    expect(applyTarot(subject(), 'hermit', ['clubs-6'])).toEqual({ ok: false, error: 'badTargets' });
  });
});

describe('Колесо Фортуны', () => {
  it('gives a random joker the player does not own about 1 time in 3', () => {
    const outs = Array.from({ length: 300 }, (_, seed) => expectOk(applyTarot(subject({ jokers: ['looter'], rng: createRng(seed) }), 'wheel', [])));
    const wins = outs.filter((out) => out.gained !== null);
    expect(wins.length).toBeGreaterThan(70);
    expect(wins.length).toBeLessThan(130);
    for (const out of wins) {
      expect(out.gained).not.toBe('looter');
      expect(out.jokers).toEqual(['looter', out.gained]);
    }
  });

  it('never gives a joker when all slots are full, but still moves the rng', () => {
    for (let seed = 0; seed < 30; seed++) {
      const before = subject({ jokers: FULL, rng: createRng(seed) });
      const out = expectOk(applyTarot(before, 'wheel', []));
      expect(out.gained).toBeNull();
      expect(out.jokers).toHaveLength(MAX_JOKERS);
      expect(out.rng).not.toEqual(before.rng);
    }
  });
});

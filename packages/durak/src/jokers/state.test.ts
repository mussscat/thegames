import { makeCard } from '@game/core';
import { describe, expect, it } from 'vitest';
import { afterBeaten, afterHitDealt, afterOwnTake, afterRound, EMPTY_JOKER_STATE, type JokerState } from './state';

const s = (over: Partial<JokerState> = {}): JokerState => ({ ...EMPTY_JOKER_STATE, ...over });

describe('joker events', () => {
  it('«Бито» charges Копилка ярости, mirrors included', () => {
    expect(afterBeaten(s(), ['rage']).rage).toBe(4);
    expect(afterBeaten(s({ rage: 4 }), ['mirror', 'rage']).rage).toBe(12);
    expect(afterBeaten(s(), ['clubs'])).toEqual(s());
  });

  it('a dealt hit spends the charge and grows Коллекционер per enhanced card', () => {
    const taken = [
      { card: makeCard('clubs', 7), enhancement: 'golden' as const },
      { card: makeCard('clubs', 8), enhancement: null },
    ];
    expect(afterHitDealt(s({ rage: 8 }), ['rage'], taken).rage).toBe(0);
    expect(afterHitDealt(s({ collected: 2 }), ['collector'], taken).collected).toBe(3);
    expect(afterHitDealt(s({ collected: 2 }), [], taken).collected).toBe(2);
  });

  it('taking resets the Чистюля streak; a clean deal grows it', () => {
    expect(afterOwnTake(s({ cleanStreak: 3 })).cleanStreak).toBe(0);
    expect(afterRound(s({ cleanStreak: 1 }), ['cleanHands'], false).cleanStreak).toBe(2);
    expect(afterRound(s({ cleanStreak: 1 }), ['cleanHands'], true).cleanStreak).toBe(1);
    expect(afterRound(s(), [], false).cleanStreak).toBe(0);
  });
});

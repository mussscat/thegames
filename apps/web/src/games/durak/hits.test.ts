import { describe, expect, it } from 'vitest';
import { formatMult, hitInfoFor } from './hits';

const hits = [{ target: 'enemy' as const, amount: 36 }];
const lastScore = { target: 'enemy' as const, chips: 12, mult: 3, damage: 36, steps: [] };

describe('hitInfoFor', () => {
  it('returns the damage with its chips and mult when the hit was scored', () => {
    expect(hitInfoFor(hits, 'enemy', lastScore)).toEqual({ damage: 36, chips: 12, mult: 3 });
  });

  it('returns only the damage when there is no matching score', () => {
    expect(hitInfoFor(hits, 'enemy', null)).toEqual({ damage: 36, chips: null, mult: null });
    expect(hitInfoFor(hits, 'enemy', { ...lastScore, damage: 5 })).toEqual({ damage: 36, chips: null, mult: null });
  });

  it('returns null for a side without hits', () => {
    expect(hitInfoFor(hits, 'player', lastScore)).toBeNull();
  });
});

describe('formatMult', () => {
  it('drops needless decimals', () => {
    expect(formatMult(3)).toBe('3');
    expect(formatMult(1.5)).toBe('1.5');
    expect(formatMult(0.30000000000000004)).toBe('0.3');
  });
});

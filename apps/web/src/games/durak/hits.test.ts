import { describe, expect, it } from 'vitest';
import { hitLabelFor, hitText } from './hits';

describe('hitText', () => {
  it('describes a taken bout', () => {
    expect(hitText({ target: 'enemy', amount: 2 })).toBe('−2');
  });
});

describe('hitLabelFor', () => {
  const hits = [{ target: 'enemy' as const, amount: 2 }];
  it('labels the side that took damage', () => {
    expect(hitLabelFor(hits, 'enemy')).toBe('−2');
  });
  it('returns null for a side without hits', () => {
    expect(hitLabelFor(hits, 'player')).toBeNull();
  });
  it('shows the score formula for a scored hit', () => {
    const lastScore = { target: 'enemy' as const, chips: 12, mult: 3, damage: 36, steps: [] };
    expect(hitLabelFor([{ target: 'enemy', amount: 36 }], 'enemy', lastScore)).toBe('−36 · 12 × 3');
    expect(hitLabelFor([{ target: 'enemy', amount: 36 }], 'player', lastScore)).toBeNull();
    expect(hitLabelFor([{ target: 'enemy', amount: 3 }], 'enemy', { ...lastScore, chips: 2, mult: 1.5, damage: 3 })).toBe('−3 · 2 × 1.5');
  });
});

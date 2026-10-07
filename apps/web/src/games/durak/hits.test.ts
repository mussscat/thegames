import { describe, expect, it } from 'vitest';
import { hitLabelFor, hitText } from './hits';

describe('hitText', () => {
  it('describes a taken bout', () => {
    expect(hitText({ target: 'enemy', amount: 2 })).toBe('−2 взял');
  });
});

describe('hitLabelFor', () => {
  const hits = [{ target: 'enemy' as const, amount: 2 }];
  it('labels the side that took damage', () => {
    expect(hitLabelFor(hits, 'enemy')).toBe('−2 взял');
  });
  it('returns null for a side without hits', () => {
    expect(hitLabelFor(hits, 'player')).toBeNull();
  });
});

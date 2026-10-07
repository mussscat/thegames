import { describe, expect, it } from 'vitest';
import { hitLabelFor, hitText } from './hits';

describe('hitText', () => {
  it('describes a taken bout', () => {
    expect(hitText({ target: 'enemy', amount: 2, reason: 'took' })).toBe('−2 взял');
  });
  it('describes the round finisher', () => {
    expect(hitText({ target: 'enemy', amount: 4, reason: 'durak' })).toBe('−4 дурак');
  });
});

describe('hitLabelFor', () => {
  const hits = [
    { target: 'enemy' as const, amount: 2, reason: 'took' as const },
    { target: 'enemy' as const, amount: 3, reason: 'durak' as const },
  ];
  it('joins all hits for one side', () => {
    expect(hitLabelFor(hits, 'enemy')).toBe('−2 взял, −3 дурак');
  });
  it('returns null for a side without hits', () => {
    expect(hitLabelFor(hits, 'player')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { formatMult } from './hits';

describe('formatMult', () => {
  it('drops needless decimals', () => {
    expect(formatMult(3)).toBe('3');
    expect(formatMult(1.5)).toBe('1.5');
    expect(formatMult(0.30000000000000004)).toBe('0.3');
  });
});

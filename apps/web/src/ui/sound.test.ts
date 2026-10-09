import { describe, expect, it } from 'vitest';
import { tickFrequency } from './sound';

describe('tickFrequency', () => {
  it('rises with every step', () => {
    expect(tickFrequency(1)).toBeGreaterThan(tickFrequency(0));
    expect(tickFrequency(5)).toBeGreaterThan(tickFrequency(4));
  });
  it('stops rising after an octave so long takes stay pleasant', () => {
    expect(tickFrequency(40)).toBe(tickFrequency(12));
    expect(tickFrequency(12)).toBeCloseTo(tickFrequency(0) * 2);
  });
});

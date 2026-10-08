import { describe, expect, it } from 'vitest';
import { fanAngle, fanDrop, handOverlap } from './fan';

describe('fanAngle', () => {
  it('is zero for a single card and symmetric around the middle', () => {
    expect(fanAngle(0, 1)).toBe(0);
    expect(fanAngle(0, 5)).toBe(-fanAngle(4, 5));
    expect(fanAngle(2, 5)).toBe(0);
  });

  it('never spreads past ±12° however many cards there are', () => {
    expect(Math.abs(fanAngle(0, 30))).toBeCloseTo(12);
    expect(fanAngle(0, 3)).toBe(-6);
  });
});

describe('fanDrop', () => {
  it('lifts the middle and drops the edges', () => {
    expect(fanDrop(2, 5)).toBe(0);
    expect(fanDrop(0, 5)).toBeGreaterThan(fanDrop(1, 5));
    expect(fanDrop(0, 1)).toBe(0);
  });
});

describe('handOverlap', () => {
  it('does not overlap a normal hand', () => {
    expect(handOverlap(1)).toBe(0);
    expect(handOverlap(6)).toBe(0);
  });

  it('squeezes a big hand into 6.5 card widths', () => {
    for (const count of [7, 13, 24]) {
      const overlap = handOverlap(count);
      const width = 1 + (count - 1) * (1 - overlap);
      expect(width).toBeCloseTo(6.5);
      expect(overlap).toBeLessThan(1);
    }
  });
});

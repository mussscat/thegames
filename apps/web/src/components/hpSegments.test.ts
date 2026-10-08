import { describe, expect, it } from 'vitest';
import { hpSegments } from './hpSegments';

describe('hpSegments', () => {
  it('has one segment per max HP, filled up to the current HP', () => {
    expect(hpSegments(3, 5)).toEqual([true, true, true, false, false]);
  });

  it('clamps HP outside 0..max', () => {
    expect(hpSegments(-2, 3)).toEqual([false, false, false]);
    expect(hpSegments(9, 2)).toEqual([true, true]);
  });

  it('is empty for a non-positive max', () => {
    expect(hpSegments(0, 0)).toEqual([]);
  });
});

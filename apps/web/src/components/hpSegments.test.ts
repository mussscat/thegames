import { describe, expect, it } from 'vitest';
import { hpSegments } from './hpSegments';

describe('hpSegments', () => {
  it('has one segment per HP for small pools, filled up to the current HP', () => {
    expect(hpSegments(3, 5)).toEqual([1, 1, 1, 0, 0]);
  });

  it('caps big pools at 10 segments, each holding an equal share, the last one partly filled', () => {
    expect(hpSegments(55, 100)).toEqual([1, 1, 1, 1, 1, 0.5, 0, 0, 0, 0]);
    expect(hpSegments(40, 40)).toHaveLength(10);
  });

  it('clamps HP outside 0..max', () => {
    expect(hpSegments(-2, 3)).toEqual([0, 0, 0]);
    expect(hpSegments(9, 2)).toEqual([1, 1]);
  });

  it('is empty for a non-positive max', () => {
    expect(hpSegments(0, 0)).toEqual([]);
  });
});

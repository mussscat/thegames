import { describe, expect, it } from 'vitest';
import { summarizeFrames } from './fpsMeter';

describe('summarizeFrames', () => {
  it('reads a steady 60 fps as 60 for both the mean and the slow tail', () => {
    const stats = summarizeFrames(Array.from({ length: 120 }, () => 1000 / 60));
    expect(stats.avg).toBeCloseTo(60, 5);
    expect(stats.p5).toBeCloseTo(60, 5);
  });

  it('the 5th percentile shows the slow frames the mean hides', () => {
    const deltas = [...Array.from({ length: 95 }, () => 10), ...Array.from({ length: 5 }, () => 100)];
    const stats = summarizeFrames(deltas);
    expect(stats.avg).toBeGreaterThan(80);
    expect(stats.p5).toBeCloseTo(10, 5);
  });

  it('is zero without frames and ignores non-positive deltas', () => {
    expect(summarizeFrames([])).toEqual({ avg: 0, p5: 0 });
    expect(summarizeFrames([0, -4])).toEqual({ avg: 0, p5: 0 });
  });
});

import { describe, expect, it } from 'vitest';
import { createVisualRng, swayPhases } from './visualRng';

describe('createVisualRng', () => {
  it('gives the same sequence for the same seed and a different one for another seed', () => {
    const run = (rng: () => number) => Array.from({ length: 5 }, rng);
    expect(run(createVisualRng(7))).toEqual(run(createVisualRng(7)));
    expect(run(createVisualRng(7))).not.toEqual(run(createVisualRng(8)));
  });

  it('stays in [0, 1)', () => {
    const rng = createVisualRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('swayPhases', () => {
  it('gives one phase per slot inside the period, all different, and the same for the same seed', () => {
    const phases = swayPhases(5, 3.4, createVisualRng(3));
    expect(phases).toHaveLength(5);
    expect(new Set(phases).size).toBe(5);
    for (const p of phases) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(3.4);
    }
    expect(swayPhases(5, 3.4, createVisualRng(3))).toEqual(phases);
  });

  it('is empty for no slots', () => {
    expect(swayPhases(0, 3.4, createVisualRng(1))).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { createVisualRng } from './visualRng';

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

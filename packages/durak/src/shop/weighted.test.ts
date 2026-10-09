import { createRng } from '@game/core';
import { describe, expect, it } from 'vitest';
import { drawUnique, pickWeighted } from './weighted';

describe('pickWeighted', () => {
  it('returns null and the same rng for an empty pool', () => {
    const rng = createRng(1);
    expect(pickWeighted([], () => 1, rng)).toEqual([null, rng]);
  });

  it('never picks a zero-weight item', () => {
    for (let seed = 0; seed < 50; seed++) {
      const [picked] = pickWeighted(['a', 'b'], (x) => (x === 'a' ? 0 : 1), createRng(seed));
      expect(picked).toBe('b');
    }
  });

  it('follows the weights roughly', () => {
    const picks = Array.from({ length: 2000 }, (_, seed) => pickWeighted(['a', 'b'], (x) => (x === 'a' ? 3 : 1), createRng(seed))[0]);
    const share = picks.filter((x) => x === 'a').length / picks.length;
    expect(share).toBeGreaterThan(0.68);
    expect(share).toBeLessThan(0.82);
  });
});

describe('drawUnique', () => {
  it('draws different items, at most the pool size', () => {
    const [drawn] = drawUnique(['a', 'b', 'c'], 5, () => 1, createRng(4));
    expect([...drawn].sort()).toEqual(['a', 'b', 'c']);
  });

  it('is deterministic for a seed', () => {
    expect(drawUnique(['a', 'b', 'c', 'd'], 2, () => 1, createRng(9))).toEqual(drawUnique(['a', 'b', 'c', 'd'], 2, () => 1, createRng(9)));
  });
});

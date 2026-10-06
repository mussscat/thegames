import { describe, expect, it } from 'vitest';
import { createRng, nextFloat, nextInt, shuffle } from './rng';

describe('rng', () => {
  it('is deterministic for the same seed', () => {
    const [a] = nextFloat(createRng(42));
    const [b] = nextFloat(createRng(42));
    expect(a).toBe(b);
  });

  it('gives different values for different seeds', () => {
    const [a] = nextFloat(createRng(1));
    const [b] = nextFloat(createRng(2));
    expect(a).not.toBe(b);
  });

  it('does not mutate the input state', () => {
    const state = createRng(7);
    nextFloat(state);
    expect(state).toEqual({ seed: 7 });
  });

  it('nextFloat stays in [0, 1)', () => {
    let rng = createRng(123);
    for (let i = 0; i < 1000; i++) {
      const [value, next] = nextFloat(rng);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      rng = next;
    }
  });

  it('nextInt covers [0, max) with integers only', () => {
    const seen = new Set<number>();
    let rng = createRng(9);
    for (let i = 0; i < 1000; i++) {
      const [value, next] = nextInt(rng, 5);
      expect(Number.isInteger(value)).toBe(true);
      seen.add(value);
      rng = next;
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('nextInt rejects non-positive or fractional max', () => {
    expect(() => nextInt(createRng(1), 0)).toThrow(RangeError);
    expect(() => nextInt(createRng(1), -3)).toThrow(RangeError);
    expect(() => nextInt(createRng(1), 2.5)).toThrow(RangeError);
  });

  it('shuffle keeps the same items and does not mutate input', () => {
    const items = Array.from({ length: 36 }, (_, i) => i);
    const copy = [...items];
    const [shuffled] = shuffle(items, createRng(5));
    expect(items).toEqual(copy);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
  });

  it('shuffle is deterministic per seed and differs between seeds', () => {
    const items = Array.from({ length: 36 }, (_, i) => i);
    const [a] = shuffle(items, createRng(1));
    const [b] = shuffle(items, createRng(1));
    const [c] = shuffle(items, createRng(2));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

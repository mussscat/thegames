import { describe, expect, it } from 'vitest';
import { parseSeed, randomSeed, seedFromUrl } from './seed';

describe('parseSeed', () => {
  it('accepts non-negative uint32 integers', () => {
    expect(parseSeed('0')).toBe(0);
    expect(parseSeed('123')).toBe(123);
    expect(parseSeed('4294967295')).toBe(4294967295);
  });

  it.each([null, '', 'abc', '-1', '1.5', '1e3', ' 12', '4294967296', '99999999999999999999'])(
    'rejects %j',
    (raw) => {
      expect(parseSeed(raw)).toBeNull();
    },
  );
});

describe('seedFromUrl', () => {
  it('reads ?seed= when valid', () => {
    expect(seedFromUrl('?seed=42')).toBe(42);
  });

  it('falls back to a random uint32 when invalid or missing', () => {
    for (const search of ['', '?seed=abc', '?seed=-5']) {
      const seed = seedFromUrl(search);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(4294967295);
    }
  });
});

describe('randomSeed', () => {
  it('returns a uint32', () => {
    const seed = randomSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(4294967295);
  });
});

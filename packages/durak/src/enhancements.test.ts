import { describe, expect, it } from 'vitest';
import { ENHANCEMENT_IDS, ENHANCEMENTS, withEnhancement } from './enhancements';

describe('enhancements', () => {
  it('defines 5 enhancements with names, short labels, descriptions and prices', () => {
    expect(ENHANCEMENT_IDS).toEqual(['golden', 'sharp', 'heavy', 'sturdy', 'coin']);
    for (const id of ENHANCEMENT_IDS) {
      expect(ENHANCEMENTS[id].id).toBe(id);
      expect(ENHANCEMENTS[id].name.length).toBeGreaterThan(0);
      expect(ENHANCEMENTS[id].short.length).toBeGreaterThan(0);
      expect(ENHANCEMENTS[id].description.length).toBeGreaterThan(0);
      expect(ENHANCEMENTS[id].price).toBeGreaterThan(0);
    }
  });

  it('withEnhancement adds or replaces without mutating the profile', () => {
    const profile = { 'clubs-7': 'golden' as const };
    expect(withEnhancement(profile, 'clubs-7', 'sharp')).toEqual({ 'clubs-7': 'sharp' });
    expect(withEnhancement(profile, 'hearts-6', 'coin')).toEqual({ 'clubs-7': 'golden', 'hearts-6': 'coin' });
    expect(profile).toEqual({ 'clubs-7': 'golden' });
  });
});

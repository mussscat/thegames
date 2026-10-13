import { describe, expect, it } from 'vitest';
import { computeScale, PILOT_TARGET } from './pixelScale';

describe('computeScale', () => {
  it('Pixel 7 portrait: whole device pixels per art pixel, CSS size is n / dpr', () => {
    // 412×915 CSS px at dpr 2.625 → 1081×2402 device px
    const s = computeScale({ cssW: 412, cssH: 915, dpr: 2.625 }, PILOT_TARGET);
    expect(s.n).toBe(6);
    expect(s.cssPerArt).toBeCloseTo(6 / 2.625, 10);
    expect(s.artW).toBe(180);
    expect(s.artH).toBe(400);
  });

  it('iPhone portrait at dpr 3', () => {
    const s = computeScale({ cssW: 390, cssH: 844, dpr: 3 }, PILOT_TARGET);
    expect(s.n).toBe(6);
    expect(s.cssPerArt).toBe(2);
    expect(s.artW).toBe(195);
    expect(s.artH).toBe(422);
  });

  it('wide desktop screen shows more art pixels, not bigger ones', () => {
    const s = computeScale({ cssW: 1920, cssH: 1080, dpr: 1 }, PILOT_TARGET);
    expect(s.n).toBe(3);
    expect(s.artW).toBe(640);
    expect(s.artH).toBe(360);
  });

  it('never drops below one device pixel per art pixel', () => {
    const s = computeScale({ cssW: 100, cssH: 100, dpr: 1 }, PILOT_TARGET);
    expect(s.n).toBe(1);
    expect(s.artW).toBe(100);
  });

  it('a manual n overrides the automatic one but is clamped to at least 1', () => {
    expect(computeScale({ cssW: 390, cssH: 844, dpr: 3 }, PILOT_TARGET, 4).n).toBe(4);
    expect(computeScale({ cssW: 390, cssH: 844, dpr: 3 }, PILOT_TARGET, 0).n).toBe(1);
  });

  it('survives a zero or missing devicePixelRatio', () => {
    expect(computeScale({ cssW: 360, cssH: 640, dpr: 0 }, PILOT_TARGET).n).toBe(2);
  });
});

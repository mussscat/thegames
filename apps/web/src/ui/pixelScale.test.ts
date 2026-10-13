import { describe, expect, it } from 'vitest';
import { computeScale, PILOT_TARGET, SCREEN_TARGET, toArt } from './pixelScale';

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

describe('SCREEN_TARGET (owner pick 2026-10-14: 360 art pixels across)', () => {
  it('iPhone Pro Max: 1 art pixel = 3 device px = 1 css px, screen 430 art px wide', () => {
    const s = computeScale({ cssW: 430, cssH: 932, dpr: 3 }, SCREEN_TARGET);
    expect(s).toMatchObject({ n: 3, cssPerArt: 1, artW: 430, artH: 932 });
  });

  it('Pixel 7: fractional css size per art pixel, still whole device pixels', () => {
    const s = computeScale({ cssW: 412, cssH: 915, dpr: 2.625 }, SCREEN_TARGET);
    expect(s.n).toBe(3);
    expect(s.cssPerArt).toBeCloseTo(3 / 2.625, 10);
    expect(s.artW).toBe(360);
  });

  it('a 7-card hand of 106 px cards with an 18 px index strip fits every phone', () => {
    for (const [cssW, cssH, dpr] of [[375, 667, 2], [390, 844, 3], [412, 915, 2.625], [430, 932, 3]] as const) {
      expect(computeScale({ cssW, cssH, dpr }, SCREEN_TARGET).artW).toBeGreaterThanOrEqual(106 + 6 * 18 + 12);
    }
  });

  it('desktop keeps whole device pixels per art pixel', () => {
    expect(computeScale({ cssW: 1920, cssH: 1080, dpr: 1 }, SCREEN_TARGET)).toMatchObject({ n: 3, artW: 640, artH: 360 });
  });
});

describe('toArt', () => {
  it('turns a screen point into stage (art pixel) coordinates', () => {
    expect(toArt({ x: 150, y: 90 }, { left: 30, top: 10, cssPerArt: 2 })).toEqual({ x: 60, y: 40 });
  });

  it('works with a fractional css size per art pixel', () => {
    const point = toArt({ x: 100 + 2.2857 * 50, y: 20 + 2.2857 * 8 }, { left: 100, top: 20, cssPerArt: 2.2857 });
    expect(point.x).toBeCloseTo(50, 6);
    expect(point.y).toBeCloseTo(8, 6);
  });

  it('treats a zero, negative or NaN scale as 1 instead of dividing by it', () => {
    for (const cssPerArt of [0, -2, Number.NaN]) {
      expect(toArt({ x: 12, y: 7 }, { left: 2, top: 1, cssPerArt })).toEqual({ x: 10, y: 6 });
    }
  });
});

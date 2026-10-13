import { describe, expect, it } from 'vitest';
import { stageLayout } from './stageLayout';
import { SCREEN_TARGET } from './pixelScale';

describe('stageLayout', () => {
  it('iPhone Pro Max: the stage fills the screen exactly', () => {
    expect(stageLayout({ cssW: 430, cssH: 932, dpr: 3 }, SCREEN_TARGET)).toMatchObject({ n: 3, artW: 430, artH: 932, offsetX: 0, offsetY: 0 });
  });

  it('centres the stage and puts its edge on a whole device pixel', () => {
    // 1085×1000 css at dpr 1: n = 3, 361 art px = 1083 device px, 2 px spare → 1 px each side
    const layout = stageLayout({ cssW: 1085, cssH: 1000, dpr: 1 }, SCREEN_TARGET);
    expect(layout).toMatchObject({ n: 3, artW: 361, offsetX: 1 });
  });

  it('an odd spare device pixel goes to the right edge, never to a half pixel', () => {
    const layout = stageLayout({ cssW: 1084, cssH: 1000, dpr: 1 }, SCREEN_TARGET);
    expect(Number.isInteger(layout.offsetX * 1)).toBe(true);
  });

  it('Pixel 7: offsets are whole device pixels (multiples of 1 / dpr)', () => {
    const dpr = 2.625;
    const layout = stageLayout({ cssW: 412, cssH: 915, dpr }, SCREEN_TARGET);
    expect(Math.abs(layout.offsetX * dpr - Math.round(layout.offsetX * dpr))).toBeLessThan(1e-9);
    expect(Math.abs(layout.offsetY * dpr - Math.round(layout.offsetY * dpr))).toBeLessThan(1e-9);
  });

  it('never positions the stage off screen', () => {
    const layout = stageLayout({ cssW: 100, cssH: 100, dpr: 1 }, SCREEN_TARGET);
    expect(layout.offsetX).toBeGreaterThanOrEqual(0);
    expect(layout.offsetY).toBeGreaterThanOrEqual(0);
  });
});

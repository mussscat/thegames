import { makeCard } from '@game/core';
import { describe, expect, it } from 'vitest';
import { ART_H, ART_W, fitEnhancementFrame, suitLayer } from './enhancementArt';
import type { Pixels } from './sheet';

function solid(w: number, h: number): Pixels {
  return { w, h, data: new Uint8ClampedArray(w * h * 4).fill(255) };
}

describe('fitEnhancementFrame', () => {
  it('brings both frame widths of the sheet (62 and 63) to the 5:7 card art size', () => {
    for (const w of [62, 63]) {
      const out = fitEnhancementFrame(solid(w, 104));
      expect([out.w, out.h]).toEqual([ART_W, ART_H]);
    }
  });

  it('rejects a frame of another size instead of drawing a skewed card', () => {
    expect(() => fitEnhancementFrame(solid(60, 104))).toThrow();
  });
});

describe('suitLayer', () => {
  const painted = (grid: ReturnType<typeof suitLayer>) =>
    grid.data.flatMap((c, i) => (c ? [[i % grid.w, Math.floor(i / grid.w)] as const] : []));

  it('draws the suit only under the two rank corners and leaves the art clear', () => {
    const pixels = painted(suitLayer(makeCard('spades', 10)));
    expect(pixels.length).toBeGreaterThan(0);
    for (const [x, y] of pixels) {
      const topLeft = x < 20 && y < 34;
      const bottomRight = x >= ART_W - 20 && y >= ART_H - 34;
      expect(topLeft || bottomRight).toBe(true);
    }
    expect(pixels.some(([x]) => x < 20)).toBe(true);
    expect(pixels.some(([x]) => x >= ART_W - 20)).toBe(true);
  });

  it('paints red suits red and black suits dark', () => {
    const colors = (suit: 'hearts' | 'clubs') => new Set(suitLayer(makeCard(suit, 6)).data.filter(Boolean));
    expect(colors('hearts')).toEqual(new Set(['#c2292e']));
    expect(colors('clubs')).toEqual(new Set(['#1b1426']));
  });
});

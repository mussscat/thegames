import { makeCard } from '@game/core';
import { describe, expect, it } from 'vitest';
import { ART_H, ART_W, composeJoker, fitEnhancementFrame, fitWholeCard, JOKER_H, JOKER_W, suitLayer } from './cardArt';
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

describe('fitWholeCard', () => {
  it('shrinks the back (120×170) and the plain card (112×148) to the same art size as the enhancements', () => {
    for (const [w, h] of [[120, 170], [112, 148]] as const) {
      const out = fitWholeCard(solid(w, h));
      expect([out.w, out.h]).toEqual([ART_W, ART_H]);
    }
  });
});

describe('composeJoker', () => {
  const flat = (w: number, h: number, rgba: readonly number[]): Pixels => ({ w, h, data: new Uint8ClampedArray(Array.from({ length: w * h }, () => rgba).flat()) });
  const at = (p: Pixels, x: number, y: number) => Array.from(p.data.subarray((y * p.w + x) * 4, (y * p.w + x) * 4 + 4));

  it('puts the character in the middle of the background and keeps the background around it', () => {
    const out = composeJoker(flat(JOKER_W, JOKER_H, [1, 2, 3, 255]), flat(10, 10, [200, 0, 0, 255]));
    expect([out.w, out.h]).toEqual([JOKER_W, JOKER_H]);
    expect(at(out, JOKER_W / 2, JOKER_H / 2)).toEqual([200, 0, 0, 255]);
    expect(at(out, 0, 0)).toEqual([1, 2, 3, 255]);
    expect(at(out, JOKER_W - 1, JOKER_H - 1)).toEqual([1, 2, 3, 255]);
  });

  it('shrinks a character wider than the card so it stays inside the frame', () => {
    const out = composeJoker(flat(JOKER_W, JOKER_H, [1, 2, 3, 255]), flat(115, 96, [200, 0, 0, 255]));
    expect(at(out, 0, JOKER_H / 2)).toEqual([1, 2, 3, 255]);
    expect(at(out, JOKER_W - 1, JOKER_H / 2)).toEqual([1, 2, 3, 255]);
    expect(at(out, JOKER_W / 2, JOKER_H / 2)).toEqual([200, 0, 0, 255]);
  });

  it('ignores the transparent margin around a character', () => {
    const margin = flat(40, 40, [0, 0, 0, 0]);
    margin.data.set([200, 0, 0, 255], (20 * 40 + 20) * 4);
    const out = composeJoker(flat(JOKER_W, JOKER_H, [1, 2, 3, 255]), margin);
    expect(at(out, Math.floor((JOKER_W - 1) / 2), Math.floor((JOKER_H - 1) / 2))).toEqual([200, 0, 0, 255]);
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

import { makeCard } from '@game/core';
import { describe, expect, it } from 'vitest';
import { clearEdgeFringe, ART_H, ART_W, CARD_S_H, CARD_S_W, JOKER_S_H, JOKER_S_W, toSmallCard, toSmallJoker, composeJoker, composeSuitLayer, composeTarot, composeTrick, fitEnhancementFrame, fitWholeCard, JOKER_H, JOKER_W, suitLayer, TARO_H, TARO_W, TRICK_H, TRICK_W } from './cardArt';
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

describe('composeTarot', () => {
  const flat = (w: number, h: number, rgba: readonly number[]): Pixels => ({ w, h, data: new Uint8ClampedArray(Array.from({ length: w * h }, () => rgba).flat()) });
  const at = (p: Pixels, x: number, y: number) => Array.from(p.data.subarray((y * p.w + x) * 4, (y * p.w + x) * 4 + 4));
  const bg = () => flat(TARO_W, TARO_H, [1, 2, 3, 255]);

  it('puts the picture in the middle of the card art area and leaves the banner and the ribbon clear', () => {
    const out = composeTarot(bg(), flat(40, 40, [200, 0, 0, 255]));
    expect([out.w, out.h]).toEqual([TARO_W, TARO_H]);
    expect(at(out, TARO_W / 2, TARO_H / 2)).toEqual([200, 0, 0, 255]);
    expect(at(out, TARO_W / 2, 6)).toEqual([1, 2, 3, 255]);
    expect(at(out, TARO_W / 2, TARO_H - 6)).toEqual([1, 2, 3, 255]);
  });

  it('shrinks a picture wider than the frame so it stays inside', () => {
    const out = composeTarot(bg(), flat(127, 87, [200, 0, 0, 255]));
    expect(at(out, 0, TARO_H / 2)).toEqual([1, 2, 3, 255]);
    expect(at(out, TARO_W - 1, TARO_H / 2)).toEqual([1, 2, 3, 255]);
    expect(at(out, TARO_W / 2, TARO_H / 2)).toEqual([200, 0, 0, 255]);
  });
});

describe('composeTrick', () => {
  const flat = (w: number, h: number, rgba: readonly number[]): Pixels => ({ w, h, data: new Uint8ClampedArray(Array.from({ length: w * h }, () => rgba).flat()) });
  const at = (p: Pixels, x: number, y: number) => Array.from(p.data.subarray((y * p.w + x) * 4, (y * p.w + x) * 4 + 4));
  const bg = () => flat(TRICK_W, TRICK_H, [1, 2, 3, 255]);

  it('puts the picture in the middle of the background and keeps the frame around it', () => {
    const out = composeTrick(bg(), flat(40, 40, [200, 0, 0, 255]));
    expect([out.w, out.h]).toEqual([TRICK_W, TRICK_H]);
    expect(at(out, Math.floor(TRICK_W / 2), Math.floor(TRICK_H / 2))).toEqual([200, 0, 0, 255]);
    expect(at(out, 0, 0)).toEqual([1, 2, 3, 255]);
    expect(at(out, TRICK_W - 1, TRICK_H - 1)).toEqual([1, 2, 3, 255]);
  });

  it('shrinks a picture wider than the frame so it stays inside', () => {
    const out = composeTrick(bg(), flat(122, 80, [200, 0, 0, 255]));
    expect(at(out, 0, TRICK_H / 2)).toEqual([1, 2, 3, 255]);
    expect(at(out, TRICK_W - 1, TRICK_H / 2)).toEqual([1, 2, 3, 255]);
  });
});

describe('composeSuitLayer', () => {
  const block = (w: number, h: number, rgba: readonly number[]): Pixels => ({ w, h, data: new Uint8ClampedArray(Array.from({ length: w * h }, () => rgba).flat()) });
  /** A pip with one blue marker pixel at its top-left, so a 180° turn is visible. */
  const pip = (): Pixels => {
    const p = block(13, 16, [200, 0, 0, 255]);
    p.data.set([0, 0, 200, 255], 0);
    return p;
  };
  const sprites = { pip: { hearts: pip(), diamonds: pip(), clubs: pip(), spades: pip() }, big: { hearts: block(67, 67, [0, 200, 0, 255]), diamonds: block(67, 67, [0, 200, 0, 255]), clubs: block(67, 67, [0, 200, 0, 255]), spades: block(67, 67, [0, 200, 0, 255]) } };
  const at = (p: Pixels, x: number, y: number) => Array.from(p.data.subarray((y * p.w + x) * 4, (y * p.w + x) * 4 + 4));
  const painted = (p: Pixels) => Array.from({ length: p.w * p.h }, (_, i) => [i % p.w, Math.floor(i / p.w)] as const).filter(([x, y]) => (p.data[(y * p.w + x) * 4 + 3] ?? 0) > 0);

  it('draws the pip under each rank corner and nothing in the middle of an enhanced card', () => {
    const out = composeSuitLayer('hearts', sprites, false);
    expect([out.w, out.h]).toEqual([ART_W, ART_H]);
    const cells = painted(out);
    expect(cells.length).toBeGreaterThan(0);
    for (const [x, y] of cells) expect((x < 20 && y < 40) || (x >= ART_W - 20 && y >= ART_H - 40)).toBe(true);
  });

  it('turns the bottom pip by 180°, as on a playing card', () => {
    const out = composeSuitLayer('hearts', sprites, false);
    const top = painted(out).filter(([x, y]) => x < 20 && y < 40);
    const bottom = painted(out).filter(([x, y]) => x >= ART_W - 20 && y >= ART_H - 40);
    const [tx, ty] = [Math.min(...top.map(([x]) => x)), Math.min(...top.map(([, y]) => y))];
    expect(at(out, tx, ty)).toEqual([0, 0, 200, 255]);
    const [bx, by] = [Math.max(...bottom.map(([x]) => x)), Math.max(...bottom.map(([, y]) => y))];
    expect(at(out, bx, by)).toEqual([0, 0, 200, 255]);
  });

  it('adds the big suit in the middle of a plain card, shrunk to fit between the corners', () => {
    const out = composeSuitLayer('spades', sprites, true);
    expect(at(out, ART_W / 2, ART_H / 2)).toEqual([0, 200, 0, 255]);
    const big = painted(out).filter(([x, y]) => x >= 20 && x < ART_W - 20 && y >= 40 && y < ART_H - 40);
    expect(big.length).toBeGreaterThan(0);
    for (const [x] of painted(out).filter(([, y]) => y >= 40 && y < ART_H - 40)) {
      expect(x).toBeGreaterThanOrEqual(10);
      expect(x).toBeLessThan(ART_W - 10);
    }
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

describe('the small sprites of the pixel stage (own native sizes, never CSS-scaled)', () => {
  it('a small playing card is 52×73, a small joker 53×72', () => {
    expect([CARD_S_W, CARD_S_H]).toEqual([52, 73]);
    expect([JOKER_S_W, JOKER_S_H]).toEqual([53, 72]);
    const card = toSmallCard(solid(ART_W, ART_H));
    expect([card.w, card.h]).toEqual([52, 73]);
    const joker = toSmallJoker(solid(JOKER_W, JOKER_H));
    expect([joker.w, joker.h]).toEqual([53, 72]);
  });

  it('keeps a transparent layer transparent and a thick shape visible', () => {
    const empty: Pixels = { w: ART_W, h: ART_H, data: new Uint8ClampedArray(ART_W * ART_H * 4) };
    expect(Array.from(toSmallCard(empty).data).every((v) => v === 0)).toBe(true);
    const blob: Pixels = { w: ART_W, h: ART_H, data: new Uint8ClampedArray(ART_W * ART_H * 4) };
    for (let y = 20; y < 40; y++) for (let x = 20; x < 40; x++) blob.data.set([10, 20, 30, 255], (y * ART_W + x) * 4);
    const small = toSmallCard(blob);
    expect(small.data[(Math.round(30 * 73 / ART_H) * 52 + Math.round(30 * 52 / ART_W)) * 4 + 3]).toBe(255);
  });

  it('refuses to grow a sprite', () => {
    expect(() => toSmallCard(solid(40, 60))).toThrow();
  });
});

describe('clearEdgeFringe', () => {
  const TAN = [200, 170, 120, 255];
  const FRINGE = [158, 40, 135, 255];
  const grid = (): Pixels => ({ w: 6, h: 6, data: new Uint8ClampedArray(Array.from({ length: 36 }, () => TAN).flat()) });
  const put = (p: Pixels, x: number, y: number, rgba: readonly number[]): void => p.data.set(rgba, (y * p.w + x) * 4);
  const read = (p: Pixels, x: number, y: number) => Array.from(p.data.subarray((y * p.w + x) * 4, (y * p.w + x) * 4 + 4));

  it('clears magenta on the outer rows but keeps the same colour inside and the frame colours', () => {
    const img = grid();
    put(img, 2, 0, FRINGE);
    put(img, 3, 3, FRINGE);
    const out = clearEdgeFringe(img);
    expect(read(out, 2, 0)).toEqual([0, 0, 0, 0]);
    expect(read(out, 3, 3)).toEqual(FRINGE);
    expect(read(out, 0, 5)).toEqual(TAN);
  });
});

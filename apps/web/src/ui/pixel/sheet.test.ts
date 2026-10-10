import { ENHANCEMENT_IDS } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { crop, dropColumns, dropRows, ENHANCEMENT_FRAMES, repeatColumns, type Pixels } from './sheet';

/** A w×h image whose red channel holds x and green channel holds y, so every pixel says where it came from. */
function coords(w: number, h: number): Pixels {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) data.set([x, y, 0, 255], (y * w + x) * 4);
  }
  return { w, h, data };
}

function at(p: Pixels, x: number, y: number): readonly [number, number] {
  const i = (y * p.w + x) * 4;
  return [p.data[i] ?? -1, p.data[i + 1] ?? -1];
}

describe('crop', () => {
  it('cuts the rectangle out of the sheet', () => {
    const out = crop(coords(10, 8), { x: 2, y: 3, w: 4, h: 2 });
    expect([out.w, out.h]).toEqual([4, 2]);
    expect(at(out, 0, 0)).toEqual([2, 3]);
    expect(at(out, 3, 1)).toEqual([5, 4]);
  });

  it('rejects a rectangle that leaves the sheet', () => {
    expect(() => crop(coords(10, 8), { x: 8, y: 0, w: 4, h: 2 })).toThrow();
  });
});

describe('dropRows', () => {
  it('removes the listed rows and keeps the rest in order', () => {
    const out = dropRows(coords(2, 5), [1, 3]);
    expect(out.h).toBe(3);
    expect([0, 1, 2].map((y) => at(out, 0, y)[1])).toEqual([0, 2, 4]);
  });
});

describe('dropColumns', () => {
  it('removes the listed columns and keeps the rest in order', () => {
    const out = dropColumns(coords(5, 2), [0, 2]);
    expect(out.w).toBe(3);
    expect([0, 1, 2].map((x) => at(out, x, 1)[0])).toEqual([1, 3, 4]);
  });
});

describe('repeatColumns', () => {
  it('doubles each listed column right after itself', () => {
    const out = repeatColumns(coords(4, 1), [1, 2]);
    expect(out.w).toBe(6);
    expect([0, 1, 2, 3, 4, 5].map((x) => at(out, x, 0)[0])).toEqual([0, 1, 1, 2, 2, 3]);
  });
});

describe('ENHANCEMENT_FRAMES', () => {
  it('has a frame for every enhancement, all inside the 344×192 sheet and the same height', () => {
    for (const id of ENHANCEMENT_IDS) {
      const f = ENHANCEMENT_FRAMES[id];
      expect(f.x + f.w).toBeLessThanOrEqual(344);
      expect(f.y + f.h).toBeLessThanOrEqual(192);
      expect(f.h).toBe(104);
    }
  });
});

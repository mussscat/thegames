import { ENHANCEMENT_IDS } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { JOKER_IDS } from '@game/durak';
import { crop, downscale, dropColumns, dropRows, ENHANCEMENT_FRAMES, fitInside, JOKER_PERS_SHEETS, keyOut, overlay, PERS_CELLS, repeatColumns, trimToContent, type Pixels } from './sheet';

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

describe('downscale', () => {
  /** 4×4: a 1-px dark ring around a light 2×2 centre. */
  function ring(): Pixels {
    const data = new Uint8ClampedArray(4 * 4 * 4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const edge = x === 0 || y === 0 || x === 3 || y === 3;
        data.set(edge ? [10, 10, 10, 255] : [200, 200, 200, 255], (y * 4 + x) * 4);
      }
    }
    return { w: 4, h: 4, data };
  }

  it('picks the most common colour of each cell, so no new colours appear', () => {
    const out = downscale(ring(), 2, 2);
    expect([out.w, out.h]).toEqual([2, 2]);
    const colours = new Set(Array.from({ length: 4 }, (_, i) => Array.from(out.data.subarray(i * 4, i * 4 + 4)).join(',')));
    expect(colours).toEqual(new Set(['10,10,10,255']));
  });

  it('keeps the size when asked for the same size', () => {
    const src = coords(5, 3);
    expect(downscale(src, 5, 3).data).toEqual(src.data);
  });

  it('rejects growing the image', () => {
    expect(() => downscale(coords(2, 2), 3, 2)).toThrow();
  });
});

describe('keyOut', () => {
  it('makes the key colour and colours close to it transparent, and leaves the rest alone', () => {
    const data = new Uint8ClampedArray([254, 6, 245, 255, 250, 12, 240, 255, 40, 60, 200, 255]);
    const out = keyOut({ w: 3, h: 1, data }, [254, 6, 245]);
    expect(Array.from(out.data)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 40, 60, 200, 255]);
    expect(Array.from(data.subarray(0, 4))).toEqual([254, 6, 245, 255]);
  });
});

describe('trimToContent', () => {
  it('crops to the bounding box of the non-transparent pixels', () => {
    const data = new Uint8ClampedArray(5 * 4 * 4);
    for (const [x, y] of [[1, 1], [3, 2]] as const) data.set([9, 9, 9, 255], (y * 5 + x) * 4);
    const out = trimToContent({ w: 5, h: 4, data });
    expect([out.w, out.h]).toEqual([3, 2]);
    expect(Array.from(out.data.subarray(0, 4))).toEqual([9, 9, 9, 255]);
  });

  it('rejects an image with nothing in it', () => {
    expect(() => trimToContent({ w: 2, h: 2, data: new Uint8ClampedArray(16) })).toThrow();
  });
});

describe('overlay', () => {
  const flat = (w: number, h: number, rgba: readonly number[]): Pixels => ({ w, h, data: new Uint8ClampedArray(Array.from({ length: w * h }, () => rgba).flat()) });

  it('paints opaque pixels of the top image onto a copy of the base, and skips transparent ones', () => {
    const top = flat(2, 1, [200, 0, 0, 255]);
    top.data.set([0, 0, 0, 0], 4);
    const base = flat(4, 2, [1, 2, 3, 255]);
    const out = overlay(base, top, 1, 1);
    expect(Array.from(out.data.subarray((1 * 4 + 1) * 4, (1 * 4 + 1) * 4 + 4))).toEqual([200, 0, 0, 255]);
    expect(Array.from(out.data.subarray((1 * 4 + 2) * 4, (1 * 4 + 2) * 4 + 4))).toEqual([1, 2, 3, 255]);
    expect(Array.from(base.data.subarray(0, 4))).toEqual([1, 2, 3, 255]);
  });

  it('clips what falls outside the base', () => {
    const out = overlay(flat(2, 2, [1, 1, 1, 255]), flat(3, 3, [5, 5, 5, 255]), 1, 1);
    expect([out.w, out.h]).toEqual([2, 2]);
    expect(Array.from(out.data.subarray(0, 4))).toEqual([1, 1, 1, 255]);
    expect(Array.from(out.data.subarray(12, 16))).toEqual([5, 5, 5, 255]);
  });
});

describe('fitInside', () => {
  it('leaves an image that already fits alone', () => {
    const src = coords(6, 4);
    expect(fitInside(src, 10, 10)).toBe(src);
  });

  it('shrinks a too wide or too tall image to fit, keeping the aspect ratio', () => {
    const wide = fitInside(coords(20, 10), 10, 10);
    expect([wide.w, wide.h]).toEqual([10, 5]);
    const tall = fitInside(coords(10, 40), 20, 20);
    expect([tall.w, tall.h]).toEqual([5, 20]);
  });
});

describe('JOKER_PERS_SHEETS', () => {
  it('names all 18 jokers once, in catalog order, six per sheet', () => {
    expect(JOKER_PERS_SHEETS).toHaveLength(3);
    for (const sheet of JOKER_PERS_SHEETS) expect(sheet.ids).toHaveLength(6);
    expect(JOKER_PERS_SHEETS.flatMap((sheet) => sheet.ids)).toEqual([...JOKER_IDS]);
  });

  it('has six cells inside the 344×192 sheet', () => {
    expect(PERS_CELLS).toHaveLength(6);
    for (const cell of PERS_CELLS) {
      expect(cell.x + cell.w).toBeLessThanOrEqual(344);
      expect(cell.y + cell.h).toBeLessThanOrEqual(192);
    }
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

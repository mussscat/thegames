import { describe, expect, it } from 'vitest';
import { plate, stamp } from './plate.mjs';

const INK = [1, 1, 1, 255];
const FILL = [2, 2, 2, 255];
const EDGE = [3, 3, 3, 255];
const LIP = [4, 4, 4, 255];
const TOP = [5, 5, 5, 255];
const OPTS = { insets: [3, 1, 1], outline: INK, fill: FILL, edge: EDGE, lip: 2, lipColor: LIP };
const at = (pixels, w, x, y) => pixels[y * w + x];
const same = (a, b) => a.join() === b.join();

describe('plate', () => {
  const w = 24;
  const h = 24;
  const pixels = plate(w, h, OPTS);

  it('has w × h pixels and is deterministic', () => {
    expect(pixels).toHaveLength(w * h);
    expect(plate(w, h, OPTS)).toEqual(pixels);
  });

  it('cuts the corners in steps: 3 transparent pixels on the first row, 1 on the next two', () => {
    const transparent = (x, y) => at(pixels, w, x, y)[3] === 0;
    expect([transparent(0, 0), transparent(2, 0), transparent(3, 0)]).toEqual([true, true, false]);
    expect([transparent(0, 1), transparent(1, 1)]).toEqual([true, false]);
    expect([transparent(0, 2), transparent(1, 2)]).toEqual([true, false]);
    expect(transparent(w - 1, h - 1)).toBe(true);
  });

  it('outlines the shape: the first opaque pixel of the top row and of the left column are outline', () => {
    expect(same(at(pixels, w, 3, 0), INK)).toBe(true);
    expect(same(at(pixels, w, 0, 5), INK)).toBe(true);
    expect(same(at(pixels, w, w - 1, 5), INK)).toBe(true);
  });

  it('is mirror-symmetric left to right', () => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) expect(at(pixels, w, x, y)).toEqual(at(pixels, w, w - 1 - x, y));
  });

  it('draws the lip on the rows just above the bottom outline and fill in the middle', () => {
    expect(same(at(pixels, w, 12, h - 2), LIP)).toBe(true);
    expect(same(at(pixels, w, 12, h - 3), LIP)).toBe(true);
    expect(same(at(pixels, w, 12, h - 4), EDGE) || same(at(pixels, w, 12, h - 4), FILL)).toBe(true);
    expect(same(at(pixels, w, 12, 12), FILL)).toBe(true);
  });

  it('adds a highlight row under the top outline only when asked', () => {
    expect(same(at(plate(w, h, { ...OPTS, top: TOP }), w, 12, 1), TOP)).toBe(true);
    expect(same(at(pixels, w, 12, 1), TOP)).toBe(false);
  });
});

describe('stamp', () => {
  it('paints # cells, leaves . cells and does not mutate the input', () => {
    const base = Array.from({ length: 4 * 3 }, () => [0, 0, 0, 0]);
    const out = stamp(base, 4, ['#.', '.#'], 1, 1, INK);
    expect(same(out[1 * 4 + 1], INK)).toBe(true);
    expect(same(out[1 * 4 + 2], INK)).toBe(false);
    expect(same(out[2 * 4 + 2], INK)).toBe(true);
    expect(base[1 * 4 + 1]).toEqual([0, 0, 0, 0]);
  });
});

import type { EnhancementId } from '@game/durak';

/** Raw RGBA pixels, row by row — the same layout as canvas ImageData. */
export type Pixels = { readonly w: number; readonly h: number; readonly data: Uint8ClampedArray };

export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

/** Where each enhancement's card sits on `assets/enhancements.png` (344×192). */
export const ENHANCEMENT_FRAMES: Readonly<Record<EnhancementId, Rect>> = {
  golden: { x: 8, y: 44, w: 63, h: 104 },
  sharp: { x: 75, y: 44, w: 62, h: 104 },
  heavy: { x: 141, y: 44, w: 62, h: 104 },
  trump: { x: 207, y: 44, w: 62, h: 104 },
  coin: { x: 273, y: 44, w: 63, h: 104 },
};

/** Builds a w×h image where `from(x, y)` names the source pixel of each output pixel. */
function remap(src: Pixels, w: number, h: number, from: (x: number, y: number) => readonly [number, number]): Pixels {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [sx, sy] = from(x, y);
      const i = (sy * src.w + sx) * 4;
      data.set(src.data.subarray(i, i + 4), (y * w + x) * 4);
    }
  }
  return { w, h, data };
}

export function crop(src: Pixels, rect: Rect): Pixels {
  if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > src.w || rect.y + rect.h > src.h) {
    throw new Error(`crop ${rect.x},${rect.y} ${rect.w}×${rect.h} leaves the ${src.w}×${src.h} sheet`);
  }
  return remap(src, rect.w, rect.h, (x, y) => [rect.x + x, rect.y + y]);
}

function indices(size: number): readonly number[] {
  return Array.from({ length: size }, (_, i) => i);
}

function without(size: number, drop: readonly number[]): readonly number[] {
  const skip = new Set(drop);
  return indices(size).filter((i) => !skip.has(i));
}

export function dropRows(src: Pixels, rows: readonly number[]): Pixels {
  const ys = without(src.h, rows);
  return remap(src, src.w, ys.length, (x, y) => [x, ys[y] ?? 0]);
}

export function dropColumns(src: Pixels, columns: readonly number[]): Pixels {
  const xs = without(src.w, columns);
  return remap(src, xs.length, src.h, (x, y) => [xs[x] ?? 0, y]);
}

/** Each listed column appears twice in a row — widens the image without scaling it. */
export function repeatColumns(src: Pixels, columns: readonly number[]): Pixels {
  const twice = new Set(columns);
  const xs = indices(src.w).flatMap((i) => (twice.has(i) ? [i, i] : [i]));
  return remap(src, xs.length, src.h, (x, y) => [xs[x] ?? 0, y]);
}

/** The card on `assets/back.png` and on `assets/plain.png` (344×192 sheets with one card each). */
export const BACK_FRAME: Rect = { x: 112, y: 11, w: 120, h: 170 };
export const PLAIN_FRAME: Rect = { x: 116, y: 22, w: 112, h: 148 };

/** Index of the most common colour among the given pixel offsets (the first one wins a tie). */
function commonest(data: Uint8ClampedArray, offsets: readonly number[]): number {
  const counts = new Map<string, number>();
  let best = offsets[0] ?? 0;
  let bestCount = 0;
  for (const i of offsets) {
    const key = data.subarray(i, i + 4).join(',');
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    if (count > bestCount) {
      best = i;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Shrinks to w×h by taking the most common colour of each source cell: unlike smoothing it adds
 * no new colours, and unlike nearest-neighbour a thin outline does not vanish on some sides.
 */
export function downscale(src: Pixels, w: number, h: number): Pixels {
  if (w > src.w || h > src.h) throw new Error(`downscale ${src.w}×${src.h} → ${w}×${h} would grow the image`);
  const span = (i: number, size: number, from: number): readonly number[] => {
    const start = Math.floor((i * from) / size);
    const end = Math.max(start + 1, Math.floor(((i + 1) * from) / size));
    return indices(end - start).map((k) => start + k);
  };
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const offsets = span(y, h, src.h).flatMap((sy) => span(x, w, src.w).map((sx) => (sy * src.w + sx) * 4));
      const i = commonest(src.data, offsets);
      data.set(src.data.subarray(i, i + 4), (y * w + x) * 4);
    }
  }
  return { w, h, data };
}

/** Browser only: decodes an image URL into pixels. */
export async function loadPixels(url: string): Promise<Pixels> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas is unavailable');
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { w: canvas.width, h: canvas.height, data };
}

/** Browser only: encodes pixels as a PNG data URL. */
export function pixelsToUrl(p: Pixels): string {
  const canvas = document.createElement('canvas');
  canvas.width = p.w;
  canvas.height = p.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.putImageData(new ImageData(new Uint8ClampedArray(p.data), p.w, p.h), 0, 0);
  return canvas.toDataURL('image/png');
}

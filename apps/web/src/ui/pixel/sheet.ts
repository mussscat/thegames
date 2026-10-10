import type { EnhancementId, FocusId, JokerId, TarotId } from '@game/durak';

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

/** A sheet of joker characters (six per sheet, 3×2 cells) on a magenta key background. */
export type JokerPersSheet = { readonly key: readonly [number, number, number]; readonly ids: readonly JokerId[] };

/** The six cells of a character sheet, in reading order; a character may be wider than its drawing area but never leaves its cell. */
export const PERS_CELLS: readonly Rect[] = [
  { x: 0, y: 0, w: 115, h: 96 },
  { x: 115, y: 0, w: 114, h: 96 },
  { x: 229, y: 0, w: 115, h: 96 },
  { x: 0, y: 96, w: 115, h: 96 },
  { x: 115, y: 96, w: 114, h: 96 },
  { x: 229, y: 96, w: 115, h: 96 },
];

/** `assets/jokers_pers_1..3.png`: the 18 jokers in catalog order. */
export const JOKER_PERS_SHEETS: readonly JokerPersSheet[] = [
  { key: [249, 8, 239], ids: ['hearts', 'diamonds', 'clubs', 'spades', 'small', 'gloat'] },
  { key: [249, 8, 239], ids: ['looter', 'piggyBank', 'longArms', 'rage', 'trumpAce', 'serial'] },
  { key: [252, 2, 251], ids: ['cardSharp', 'usurer', 'cleanHands', 'mirror', 'collector', 'thickSkin'] },
];

/** A sheet of tarot pictures (four per sheet, 2×2 cells) on a magenta key background. */
export type TaroSheet = { readonly key: readonly [number, number, number]; readonly ids: readonly TarotId[] };

/** The four cells of a tarot sheet in reading order; they end at x = 342 because the last column holds a stray pixel. */
export const TARO_CELLS: readonly Rect[] = [
  { x: 0, y: 0, w: 172, h: 96 },
  { x: 172, y: 0, w: 171, h: 96 },
  { x: 0, y: 96, w: 172, h: 96 },
  { x: 172, y: 96, w: 171, h: 96 },
];

/** `assets/taro_1.png`, `assets/taro_2.png`: the 8 tarots in catalog order. */
export const TARO_SHEETS: readonly TaroSheet[] = [
  { key: [249, 8, 239], ids: ['sun', 'tower', 'star', 'chariot'] },
  { key: [249, 8, 239], ids: ['emperor', 'death', 'hermit', 'wheel'] },
];

/** The tarot backgrounds come with their rounded corners filled with this key colour. */
export const TARO_BG_KEY: readonly [number, number, number] = [250, 5, 247];

/** A sheet of focus pictures (3×2 cells) on a magenta key background. */
export type TrickSheet = { readonly key: readonly [number, number, number]; readonly ids: readonly FocusId[] };

/** The six cells of a focus sheet; the split after column one is wide because the flag of Разгон reaches x = 118. */
export const TRICK_CELLS: readonly Rect[] = [
  { x: 0, y: 0, w: 122, h: 96 },
  { x: 122, y: 0, w: 110, h: 96 },
  { x: 232, y: 0, w: 112, h: 96 },
  { x: 0, y: 96, w: 122, h: 96 },
  { x: 122, y: 96, w: 110, h: 96 },
  { x: 232, y: 96, w: 112, h: 96 },
];

/** `assets/tricks_1.png`, `assets/tricks_2.png`: the 10 focuses in catalog order. */
export const TRICK_SHEETS: readonly TrickSheet[] = [
  { key: [249, 8, 239], ids: ['peek', 'foresight', 'redeal', 'boost', 'pad', 'shield'] },
  { key: [249, 8, 239], ids: ['piggy', 'swap', 'doubler', 'suitShift'] },
];

/** Tight boxes of the coins on `assets/coin.png` (the third row repeats the second and is unused). */
export const COIN_FRAMES = {
  spin: [
    { x: 4, y: 5, w: 55, h: 55 },
    { x: 69, y: 5, w: 42, h: 55 },
    { x: 127, y: 5, w: 35, h: 55 },
    { x: 195, y: 5, w: 12, h: 55 },
    { x: 241, y: 5, w: 34, h: 55 },
    { x: 292, y: 5, w: 44, h: 55 },
  ],
  face: { x: 4, y: 68, w: 55, h: 56 },
  red: { x: 94, y: 68, w: 57, h: 56 },
  grey: { x: 183, y: 68, w: 57, h: 56 },
  plate: { x: 286, y: 68, w: 54, h: 56 },
} as const satisfies { readonly spin: readonly Rect[]; readonly face: Rect; readonly red: Rect; readonly grey: Rect; readonly plate: Rect };
export const COIN_KEY: readonly [number, number, number] = [253, 6, 230];

/** Interface icons in sheet order (icons_1..3, 4×2 cells each). */
export const ICON_IDS = [
  'chip', 'mult', 'heart', 'heartEmpty', 'shield', 'suitHearts', 'suitDiamonds', 'suitClubs',
  'suitSpades', 'boost', 'pad', 'doubler', 'crown', 'deck', 'reroll', 'tag',
  'skull', 'skullStrong', 'skullBoss', 'hand', 'check', 'eye', 'ball',
] as const;
export type IconId = (typeof ICON_IDS)[number];

export type IconSheet = { readonly key: readonly [number, number, number]; readonly ids: readonly IconId[] };

/** Eight icon cells, 4 across and 2 down. */
export const ICON_CELLS: readonly Rect[] = [0, 96].flatMap((y) => [0, 86, 172, 258].map((x) => ({ x, y, w: 86, h: 96 })));

export const ICON_SHEETS: readonly IconSheet[] = [
  { key: [236, 23, 224], ids: ICON_IDS.slice(0, 8) },
  { key: [249, 8, 239], ids: ICON_IDS.slice(8, 16) },
  { key: [236, 23, 224], ids: ICON_IDS.slice(16) },
];

/** How far (per channel) a colour may stray from the key and still count as background. */
const KEY_TOLERANCE = 30;

/** Turns the key-coloured background transparent; returns a new image. */
export function keyOut(src: Pixels, key: readonly [number, number, number]): Pixels {
  const data = new Uint8ClampedArray(src.data);
  for (let i = 0; i < data.length; i += 4) {
    const near = key.every((v, c) => Math.abs((data[i + c] ?? 0) - v) <= KEY_TOLERANCE);
    if (near) data.fill(0, i, i + 4);
  }
  return { w: src.w, h: src.h, data };
}

/** Darker blends of the key (key × t) count as background down to this brightness. */
const FRINGE_MIN_BRIGHTNESS = 0.35;
const FRINGE_TOLERANCE = 28;

/**
 * `keyOut` plus the fringe: where a sprite's outline meets the key colour the generator leaves darker shades of the
 * key (key × t, t from 0.35 to 1). Use it on icons and coins; on sheets whose ground shadow is a dark purple, plain
 * `keyOut` keeps that shadow.
 */
export function keyOutFringe(src: Pixels, key: readonly [number, number, number]): Pixels {
  const data = new Uint8ClampedArray(src.data);
  const keySum = key[0] + key[2];
  for (let i = 0; i < data.length; i += 4) {
    const t = ((data[i] ?? 0) + (data[i + 2] ?? 0)) / keySum;
    const shade = t >= FRINGE_MIN_BRIGHTNESS && t <= 1.08 && key.every((v, c) => Math.abs((data[i + c] ?? 0) - v * t) <= FRINGE_TOLERANCE);
    if (shade) data.fill(0, i, i + 4);
  }
  return { w: src.w, h: src.h, data };
}

/** Crops to the bounding box of the non-transparent pixels. */
export function trimToContent(src: Pixels): Pixels {
  let x0 = src.w;
  let y0 = src.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      if ((src.data[(y * src.w + x) * 4 + 3] ?? 0) === 0) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  if (x1 < 0) throw new Error('trimToContent: the image is fully transparent');
  return crop(src, { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
}

/** A copy of `base` with the opaque pixels of `top` painted at (x, y); whatever falls outside the base is clipped. */
export function overlay(base: Pixels, top: Pixels, x: number, y: number): Pixels {
  const data = new Uint8ClampedArray(base.data);
  for (let ty = 0; ty < top.h; ty++) {
    for (let tx = 0; tx < top.w; tx++) {
      const bx = x + tx;
      const by = y + ty;
      if (bx < 0 || by < 0 || bx >= base.w || by >= base.h) continue;
      const i = (ty * top.w + tx) * 4;
      if ((top.data[i + 3] ?? 0) === 0) continue;
      data.set(top.data.subarray(i, i + 4), (by * base.w + bx) * 4);
    }
  }
  return { w: base.w, h: base.h, data };
}

/** Shrinks (never grows) to fit the box, keeping the aspect ratio; an image that already fits is returned as is. */
export function fitInside(src: Pixels, maxW: number, maxH: number): Pixels {
  if (src.w <= maxW && src.h <= maxH) return src;
  const scale = Math.min(maxW / src.w, maxH / src.h);
  return downscale(src, Math.max(1, Math.round(src.w * scale)), Math.max(1, Math.round(src.h * scale)));
}

/** Centres the image on a transparent square as wide as its longer side, so differently shaped icons share one box. */
export function padSquare(src: Pixels): Pixels {
  if (src.w === src.h) return src;
  const side = Math.max(src.w, src.h);
  return overlay({ w: side, h: side, data: new Uint8ClampedArray(side * side * 4) }, src, Math.floor((side - src.w) / 2), Math.floor((side - src.h) / 2));
}

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

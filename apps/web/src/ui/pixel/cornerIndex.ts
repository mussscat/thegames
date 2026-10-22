import { isRedSuit, type Card, type Suit } from '@game/core';
import { fitInside, overlay, rotate180, type Pixels } from './sheet';

/** Hand-drawn 7×7 corner suits, symmetric and one pixel per art pixel. */
const PIPS: Readonly<Record<Suit, readonly string[]>> = {
  hearts: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  diamonds: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  clubs: ['..XXX..', '..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '...X...', '..XXX..'],
  spades: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '...X...', '..XXX..'],
};

const INK: readonly number[] = [0x1b, 0x14, 0x26, 255];
const RED: readonly number[] = [0xc2, 0x29, 0x2e, 255];

const blank = (w: number, h: number): Pixels => ({ w, h, data: new Uint8ClampedArray(w * h * 4) });

function stamp(into: Pixels, rows: readonly string[], ox: number, oy: number, scale: number, rgba: readonly number[]): void {
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch !== 'X') return;
      for (let i = 0; i < scale * scale; i++) {
        const px = ox + x * scale + (i % scale);
        const py = oy + y * scale + Math.floor(i / scale);
        into.data.set(rgba, (py * into.w + px) * 4);
      }
    }),
  );
}

type Metrics = { readonly scale: number; readonly col: number; readonly left: number; readonly pipTop: number; readonly bigBox: { readonly w: number; readonly h: number } };
/**
 * Big card 74×104: pip at 2×, column centred on x = 12; small card 52×73: 1×, centred on x = 9. `pipTop` leaves room above
 * the pip for the rank text (m6x11, drawn by CSS: 22 px on the big card, 18 px on the small one).
 */
const METRICS = { l: { scale: 2, col: 18, left: 3, pipTop: 27, bigBox: { w: 38, h: 44 } }, s: { scale: 1, col: 10, left: 4, pipTop: 20, bigBox: { w: 24, h: 28 } } } as const satisfies Record<string, Metrics>;

const HALO: readonly number[] = [0xf3, 0xec, 0xe0, 255];

/** A copy of `src` grown by `ring` pixels all round, with a cream ring of that width drawn behind the opaque pixels. */
export function withHalo(src: Pixels, ring: number): Pixels {
  const out = blank(src.w + ring * 2, src.h + ring * 2);
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      if ((src.data[(y * src.w + x) * 4 + 3] ?? 0) === 0) continue;
      for (let dy = -ring; dy <= ring; dy++) {
        for (let dx = -ring; dx <= ring; dx++) out.data.set(HALO, ((y + ring + dy) * out.w + x + ring + dx) * 4);
      }
    }
  }
  for (let i = 0; i < src.w * src.h; i++) {
    if ((src.data[i * 4 + 3] ?? 0) === 0) continue;
    const x = i % src.w;
    const y = Math.floor(i / src.w);
    out.data.set(src.data.subarray(i * 4, i * 4 + 4), ((y + ring) * out.w + x + ring) * 4);
  }
  return out;
}

/** The corner suit pip, centred in the corner column. */
export function cornerBlock(card: Card, size: 'l' | 's'): Pixels {
  const m = METRICS[size];
  const pipSize = 7 * m.scale;
  const out = blank(m.col, pipSize);
  stamp(out, PIPS[card.suit], Math.floor((m.col - pipSize) / 2), 0, m.scale, isRedSuit(card.suit) ? RED : INK);
  return out;
}

/** The suit layer of a face: a pip under the top-left rank and (turned 180°) above the bottom-right one, plus the big suit on a plain card. */
export function composeIndexLayer(card: Card, size: 'l' | 's', width: number, height: number, bigSuit: Pixels | undefined, haloed = false): Pixels {
  const m = METRICS[size];
  const plainBlock = cornerBlock(card, size);
  const ring = haloed ? 1 : 0;
  const block = haloed ? withHalo(plainBlock, ring) : plainBlock;
  const left = m.left - ring;
  const top = m.pipTop - ring;
  const corners = overlay(overlay(blank(width, height), block, left, top), rotate180(block), width - left - block.w, height - top - block.h);
  if (!bigSuit) return corners;
  const big = fitInside(bigSuit, m.bigBox.w, m.bigBox.h);
  return overlay(corners, big, Math.floor((width - big.w) / 2), Math.floor((height - big.h) / 2));
}

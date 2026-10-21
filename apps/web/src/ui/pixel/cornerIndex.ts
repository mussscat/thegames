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
const METRICS = { l: { scale: 2, col: 18, left: 3, pipTop: 31, bigBox: { w: 38, h: 44 } }, s: { scale: 1, col: 10, left: 4, pipTop: 23, bigBox: { w: 24, h: 28 } } } as const satisfies Record<string, Metrics>;

/** The corner suit pip, centred in the corner column. */
export function cornerBlock(card: Card, size: 'l' | 's'): Pixels {
  const m = METRICS[size];
  const pipSize = 7 * m.scale;
  const out = blank(m.col, pipSize);
  stamp(out, PIPS[card.suit], Math.floor((m.col - pipSize) / 2), 0, m.scale, isRedSuit(card.suit) ? RED : INK);
  return out;
}

/** The suit layer of a face: a pip under the top-left rank and (turned 180°) above the bottom-right one, plus the big suit on a plain card. */
export function composeIndexLayer(card: Card, size: 'l' | 's', width: number, height: number, bigSuit: Pixels | undefined): Pixels {
  const m = METRICS[size];
  const block = cornerBlock(card, size);
  const corners = overlay(overlay(blank(width, height), block, m.left, m.pipTop), rotate180(block), width - m.left - block.w, height - m.pipTop - block.h);
  if (!bigSuit) return corners;
  const big = fitInside(bigSuit, m.bigBox.w, m.bigBox.h);
  return overlay(corners, big, Math.floor((width - big.w) / 2), Math.floor((height - big.h) / 2));
}

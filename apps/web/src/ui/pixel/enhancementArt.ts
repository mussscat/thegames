import { isRedSuit, type Card } from '@game/core';
import { ENHANCEMENT_IDS, type EnhancementId } from '@game/durak';
import sheetUrl from '../../assets/enhancements.png';
import { MINI_SUITS } from './cardSprite';
import { createGrid, setPixel, toDataUrl, type Grid } from './pixelArt';
import { crop, dropColumns, ENHANCEMENT_FRAMES, loadPixels, pixelsToUrl, repeatColumns, type Pixels } from './sheet';

/** Enhanced card art: the 3:5 sheet frame widened to 5:7 (variant C from the lab). */
export const ART_W = 74;
export const ART_H = 104;

const FRAME_W = 62;
const range = (from: number, to: number): readonly number[] => Array.from({ length: to - from }, (_, i) => from + i);
/** Plain background columns either side of the emblem: doubling them widens the card without touching the emblem. */
const WIDEN_COLUMNS = [...range(5, 11), ...range(52, 58)];

export function fitEnhancementFrame(raw: Pixels): Pixels {
  if (raw.h !== ART_H || (raw.w !== FRAME_W && raw.w !== FRAME_W + 1)) {
    throw new Error(`enhancement frame ${raw.w}×${raw.h}, expected ${FRAME_W}×${ART_H}`);
  }
  const even = raw.w > FRAME_W ? dropColumns(raw, [4]) : raw;
  return repeatColumns(even, WIDEN_COLUMNS);
}

const INK = '#1b1426';
const RED = '#c2292e';
/** The corner column the rank and the suit are centred on (CSS mirrors it in `.face--art`). */
const CORNER_X = 3;
const CORNER_W = 18;
/** How far below the corner's top the suit starts — leaves room for the rank text. */
const SUIT_DROP = 18;
const SUIT = 10;

function stampSuit(grid: Grid, rows: readonly string[], ox: number, oy: number, color: string, flip: boolean): void {
  rows.forEach((row, my) =>
    [...row].forEach((ch, mx) => {
      if (ch !== 'X') return;
      const x = flip ? row.length - 1 - mx : mx;
      const y = flip ? rows.length - 1 - my : my;
      for (let i = 0; i < 4; i++) setPixel(grid, ox + x * 2 + (i % 2), oy + y * 2 + Math.floor(i / 2), color);
    }),
  );
}

/** Transparent layer with the suit under each rank corner; the rank itself is text drawn by the UI. */
export function suitLayer(card: Card): Grid {
  const grid = createGrid(ART_W, ART_H);
  const ink = isRedSuit(card.suit) ? RED : INK;
  const inset = CORNER_X + (CORNER_W - SUIT) / 2;
  stampSuit(grid, MINI_SUITS[card.suit], inset, CORNER_X + SUIT_DROP, ink, false);
  stampSuit(grid, MINI_SUITS[card.suit], ART_W - inset - SUIT, ART_H - CORNER_X - SUIT_DROP - SUIT, ink, true);
  return grid;
}

let artUrls: Readonly<Partial<Record<EnhancementId, string>>> = {};
const suitUrls = new Map<string, string>();

/**
 * Slices the sheet once at startup. Until it resolves — or if the sheet fails to load —
 * `enhancementArtUrl` returns undefined and cards fall back to the procedural art.
 */
export async function preloadEnhancementArt(): Promise<void> {
  const sheet = await loadPixels(sheetUrl);
  artUrls = Object.fromEntries(ENHANCEMENT_IDS.map((id) => [id, pixelsToUrl(fitEnhancementFrame(crop(sheet, ENHANCEMENT_FRAMES[id])))]));
}

export function enhancementArtUrl(id: EnhancementId): string | undefined {
  return artUrls[id];
}

export function suitLayerUrl(card: Card): string {
  const hit = suitUrls.get(card.suit);
  if (hit) return hit;
  const url = toDataUrl(suitLayer(card));
  suitUrls.set(card.suit, url);
  return url;
}

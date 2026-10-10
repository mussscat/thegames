import { isRedSuit, type Card } from '@game/core';
import { ENHANCEMENT_IDS, FOCUSES, JOKERS, RARITIES, TAROTS, type EnhancementId, type FocusId, type JokerId, type Rarity, type TarotId } from '@game/durak';
import backSheetUrl from '../../assets/back.png';
import enhancementSheetUrl from '../../assets/enhancements.png';
import jokerBgCommonUrl from '../../assets/joker_bg_common.png';
import jokerBgLegendaryUrl from '../../assets/joker_bg_legendary.png';
import jokerBgRareUrl from '../../assets/joker_bg_rare.png';
import jokerPers1Url from '../../assets/jokers_pers_1.png';
import jokerPers2Url from '../../assets/jokers_pers_2.png';
import jokerPers3Url from '../../assets/jokers_pers_3.png';
import trickBgCommonUrl from '../../assets/tricks_bg_common.png';
import trickBgLegendaryUrl from '../../assets/tricks_bg_legendary.png';
import trickBgRareUrl from '../../assets/tricks_bg_rare.png';
import trickSheet1Url from '../../assets/tricks_1.png';
import trickSheet2Url from '../../assets/tricks_2.png';
import taroBgCommonUrl from '../../assets/taro_bg_common.png';
import taroBgLegendaryUrl from '../../assets/taro_bg_legendary.png';
import taroBgRareUrl from '../../assets/taro_bg_rare.png';
import taroSheet1Url from '../../assets/taro_1.png';
import taroSheet2Url from '../../assets/taro_2.png';
import plainSheetUrl from '../../assets/plain.png';
import { MINI_SUITS } from './cardSprite';
import { createGrid, setPixel, toDataUrl, type Grid } from './pixelArt';
import { BACK_FRAME, crop, downscale, dropColumns, ENHANCEMENT_FRAMES, fitInside, JOKER_PERS_SHEETS, keyOut, loadPixels, overlay, PERS_CELLS, PLAIN_FRAME, pixelsToUrl, repeatColumns, TARO_BG_KEY, TARO_CELLS, TARO_SHEETS, trimToContent, TRICK_CELLS, TRICK_SHEETS, type Pixels, type Rect } from './sheet';

/** Card art size: the 3:5 enhancement frames are widened to it (variant C from the lab), the back and the plain card shrunk to it. */
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

/** The back and the plain card are drawn at a finer pixel; shrinking them keeps one pixel size across the hand. */
export function fitWholeCard(raw: Pixels): Pixels {
  return downscale(raw, ART_W, ART_H);
}

/** Lays the character in the middle of the box on a copy of the background; a character larger than the box is shrunk to it. */
function composeCard(background: Pixels, character: Pixels, box: Rect): Pixels {
  const fitted = fitInside(trimToContent(character), box.w, box.h);
  return overlay(background, fitted, box.x + Math.floor((box.w - fitted.w) / 2), box.y + Math.floor((box.h - fitted.h) / 2));
}

/** Joker card: the rarity background (106×144) with the character on top. */
export const JOKER_W = 106;
export const JOKER_H = 144;
/** Room for a character inside the background's frame; wider characters (the chain, the fist) are shrunk to it. */
const JOKER_BOX: Rect = { x: 6, y: 9, w: 94, h: 126 };

export function composeJoker(background: Pixels, character: Pixels): Pixels {
  return composeCard(background, character, JOKER_BOX);
}

/** Tarot card: the rarity background (106×160) with a banner on top for the numeral and a ribbon below for the name. */
export const TARO_W = 106;
export const TARO_H = 160;
/** The picture sits between the banner and the ribbon. */
const TARO_BOX: Rect = { x: 8, y: 28, w: 90, h: 102 };

export function composeTarot(background: Pixels, character: Pixels): Pixels {
  return composeCard(background, character, TARO_BOX);
}

/** Focus card: the rarity background (107–108×150, a teal circuit board) with the picture in the middle. */
export const TRICK_W = 107;
export const TRICK_H = 150;
const TRICK_BOX: Rect = { x: 7, y: 9, w: 93, h: 132 };

export function composeTrick(background: Pixels, character: Pixels): Pixels {
  return composeCard(background, character, TRICK_BOX);
}

const JOKER_BACKGROUNDS: Readonly<Record<Rarity, string>> = { common: jokerBgCommonUrl, rare: jokerBgRareUrl, legendary: jokerBgLegendaryUrl };
const JOKER_PERS_URLS: readonly string[] = [jokerPers1Url, jokerPers2Url, jokerPers3Url];
const TARO_BACKGROUNDS: Readonly<Record<Rarity, string>> = { common: taroBgCommonUrl, rare: taroBgRareUrl, legendary: taroBgLegendaryUrl };
const TRICK_BACKGROUNDS: Readonly<Record<Rarity, string>> = { common: trickBgCommonUrl, rare: trickBgRareUrl, legendary: trickBgLegendaryUrl };
const TRICK_URLS: readonly string[] = [trickSheet1Url, trickSheet2Url];
const TARO_URLS: readonly string[] = [taroSheet1Url, taroSheet2Url];

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
let plainUrl: string | undefined;
let backUrl: string | undefined;
let jokerUrls: Readonly<Partial<Record<JokerId, string>>> = {};
/** One common-rarity card back per pack kind: the emblem stand-in of the pack art. */
let backdropUrls: Readonly<Partial<Record<'jokers' | 'arcana' | 'focuses' | 'deck', string>>> = {};
let trickUrls: Readonly<Partial<Record<FocusId, string>>> = {};
let tarotUrls: Readonly<Partial<Record<TarotId, string>>> = {};
const suitUrls = new Map<string, string>();

/**
 * Slices the sheets once at startup; each loads on its own. Until a sheet resolves — or if it fails to
 * load — its getter returns undefined and those cards fall back to the procedural canvas art.
 */
export async function preloadCardArt(): Promise<void> {
  await Promise.allSettled([
    loadPixels(enhancementSheetUrl).then((sheet) => {
      artUrls = Object.fromEntries(ENHANCEMENT_IDS.map((id) => [id, pixelsToUrl(fitEnhancementFrame(crop(sheet, ENHANCEMENT_FRAMES[id])))]));
    }),
    loadPixels(plainSheetUrl).then((sheet) => {
      plainUrl = pixelsToUrl(fitWholeCard(crop(sheet, PLAIN_FRAME)));
    }),
    loadPixels(backSheetUrl).then((sheet) => {
      backUrl = pixelsToUrl(fitWholeCard(crop(sheet, BACK_FRAME)));
      backdropUrls = { ...backdropUrls, deck: backUrl };
    }),
    loadJokerArt(),
    loadTarotArt(),
    loadTrickArt(),
  ]);
}

/** Backgrounds first, then each character sheet on its own: a missing sheet only costs its six jokers their sprites. */
async function loadJokerArt(): Promise<void> {
  const loaded = await Promise.all(RARITIES.map((rarity) => loadPixels(JOKER_BACKGROUNDS[rarity])));
  const backgrounds = Object.fromEntries(RARITIES.map((rarity, i) => [rarity, loaded[i]])) as Record<Rarity, Pixels>;
  backdropUrls = { ...backdropUrls, jokers: pixelsToUrl(backgrounds.common) };
  await Promise.allSettled(
    JOKER_PERS_SHEETS.map(async (sheet, index) => {
      const url = JOKER_PERS_URLS[index];
      if (!url) return;
      const pixels = keyOut(await loadPixels(url), sheet.key);
      const cards = sheet.ids.flatMap((id, cell) => {
        const frame = PERS_CELLS[cell];
        return frame ? [[id, pixelsToUrl(composeJoker(backgrounds[JOKERS[id].rarity], crop(pixels, frame)))] as const] : [];
      });
      jokerUrls = { ...jokerUrls, ...Object.fromEntries(cards) };
    }),
  );
}

/** Same as the jokers: the three backgrounds first, then each picture sheet on its own. */
async function loadTarotArt(): Promise<void> {
  const loaded = await Promise.all(RARITIES.map(async (rarity) => keyOut(await loadPixels(TARO_BACKGROUNDS[rarity]), TARO_BG_KEY)));
  const backgrounds = Object.fromEntries(RARITIES.map((rarity, i) => [rarity, loaded[i]])) as Record<Rarity, Pixels>;
  backdropUrls = { ...backdropUrls, arcana: pixelsToUrl(backgrounds.common) };
  await Promise.allSettled(
    TARO_SHEETS.map(async (sheet, index) => {
      const url = TARO_URLS[index];
      if (!url) return;
      const pixels = keyOut(await loadPixels(url), sheet.key);
      const cards = sheet.ids.flatMap((id, cell) => {
        const frame = TARO_CELLS[cell];
        return frame ? [[id, pixelsToUrl(composeTarot(backgrounds[TAROTS[id].rarity], crop(pixels, frame)))] as const] : [];
      });
      tarotUrls = { ...tarotUrls, ...Object.fromEntries(cards) };
    }),
  );
}

/** Same as the jokers and tarots: three backgrounds first, then each picture sheet on its own. */
async function loadTrickArt(): Promise<void> {
  const loaded = await Promise.all(RARITIES.map((rarity) => loadPixels(TRICK_BACKGROUNDS[rarity])));
  const backgrounds = Object.fromEntries(RARITIES.map((rarity, i) => [rarity, loaded[i]])) as Record<Rarity, Pixels>;
  backdropUrls = { ...backdropUrls, focuses: pixelsToUrl(backgrounds.common) };
  await Promise.allSettled(
    TRICK_SHEETS.map(async (sheet, index) => {
      const url = TRICK_URLS[index];
      if (!url) return;
      const pixels = keyOut(await loadPixels(url), sheet.key);
      const cards = sheet.ids.flatMap((id, cell) => {
        const frame = TRICK_CELLS[cell];
        return frame ? [[id, pixelsToUrl(composeTrick(backgrounds[FOCUSES[id].rarity], crop(pixels, frame)))] as const] : [];
      });
      trickUrls = { ...trickUrls, ...Object.fromEntries(cards) };
    }),
  );
}

export function enhancementArtUrl(id: EnhancementId): string | undefined {
  return artUrls[id];
}

export function plainArtUrl(): string | undefined {
  return plainUrl;
}

export function backArtUrl(): string | undefined {
  return backUrl;
}

/** A card back in the colours of the pack kind (jokers, tarots, focuses, playing cards). */
export function packBackdropUrl(kind: 'jokers' | 'arcana' | 'focuses' | 'deck'): string | undefined {
  return backdropUrls[kind];
}

export function focusArtUrl(id: FocusId): string | undefined {
  return trickUrls[id];
}

export function tarotArtUrl(id: TarotId): string | undefined {
  return tarotUrls[id];
}

export function jokerArtUrl(id: JokerId): string | undefined {
  return jokerUrls[id];
}

export function suitLayerUrl(card: Card): string {
  const hit = suitUrls.get(card.suit);
  if (hit) return hit;
  const url = toDataUrl(suitLayer(card));
  suitUrls.set(card.suit, url);
  return url;
}

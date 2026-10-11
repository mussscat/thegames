import coinSheetUrl from '../../assets/coin.png';
import iconSheet1Url from '../../assets/icons_1.png';
import iconSheet2Url from '../../assets/icons_2.png';
import iconSheet3Url from '../../assets/icons_3.png';
import { COIN_FRAMES, COIN_KEY, crop, ICON_CELLS, ICON_SHEETS, keyOutFringe, loadPixels, padToBox, pixelsToUrl, shrinkBy, shrinkToFit, trimToContent, type IconId, type Pixels, type Rect } from './sheet';

export type CoinKind = 'face' | 'red' | 'grey' | 'plate';

const ICON_URLS: readonly string[] = [iconSheet1Url, iconSheet2Url, iconSheet3Url];

let coinUrls: Readonly<Partial<Record<CoinKind, string>>> = {};
let spinUrls: readonly string[] = [];
let iconUrls: Readonly<Partial<Record<IconId, string>>> = {};

/** Every icon is shrunk by its own whole factor to fit 18 px (a skull ÷2, a chip ÷4); the coin sits in 57 px and is shrunk ×3 → 19 px. */
const ICON_SIZE = 18;
const COIN_BOX = 57;
const COIN_SHRINK = 3;

const coinUrlOf = (sheet: Pixels, frame: Rect): string => pixelsToUrl(shrinkBy(padToBox(crop(sheet, frame), COIN_BOX), COIN_SHRINK));

async function loadCoin(): Promise<void> {
  const sheet = keyOutFringe(await loadPixels(coinSheetUrl), COIN_KEY);
  coinUrls = {
    face: coinUrlOf(sheet, COIN_FRAMES.face),
    red: coinUrlOf(sheet, COIN_FRAMES.red),
    grey: coinUrlOf(sheet, COIN_FRAMES.grey),
    plate: coinUrlOf(sheet, COIN_FRAMES.plate),
  };
  spinUrls = COIN_FRAMES.spin.map((frame) => coinUrlOf(sheet, frame));
}

/** Each icon is cut from its cell, trimmed and centred on a square, so every one fits the same box. */
async function loadIcons(): Promise<void> {
  await Promise.allSettled(
    ICON_SHEETS.map(async (sheet, index) => {
      const url = ICON_URLS[index];
      if (!url) return;
      const pixels = keyOutFringe(await loadPixels(url), sheet.key);
      const icons = sheet.ids.flatMap((id, cell) => {
        const frame = ICON_CELLS[cell];
        if (!frame) return [];
        try {
          return [[id, pixelsToUrl(shrinkToFit(trimToContent(crop(pixels, frame)), ICON_SIZE))] as const];
        } catch {
          return [];
        }
      });
      iconUrls = { ...iconUrls, ...Object.fromEntries(icons) };
    }),
  );
}

/**
 * Slices the coin and icon sheets once at startup. A sheet that fails to load only costs its pictures:
 * the getters return undefined and the UI falls back to a text symbol.
 */
export async function preloadUiArt(): Promise<void> {
  await Promise.allSettled([loadCoin(), loadIcons()]);
}

export function coinUrl(kind: CoinKind): string | undefined {
  return coinUrls[kind];
}

/** The six frames of the spinning coin, in order. */
export function coinSpinUrls(): readonly string[] {
  return spinUrls;
}

export function iconUrl(id: IconId): string | undefined {
  return iconUrls[id];
}

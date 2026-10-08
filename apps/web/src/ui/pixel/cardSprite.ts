import type { Card, Suit } from '@game/core';
import type { EnhancementId } from '@game/durak';
import { createGrid, ditherIndex, getPixel, mix, setPixel, stampOutlinedIcon, stampShaded, toDataUrl, type Grid } from './pixelArt';

/** 50×70 pixel sprite: enough pixels for dithered gradients, bevels and shaded shapes. */
export const SPRITE_W = 50;
export const SPRITE_H = 70;

const INK = '#1b1426';
const RED = '#c2292e';

const MINI_SUITS: Readonly<Record<Suit, readonly string[]>> = {
  hearts: ['XX.XX', 'XXXXX', 'XXXXX', '.XXX.', '..X..'],
  diamonds: ['..X..', '.XXX.', 'XXXXX', '.XXX.', '..X..'],
  clubs: ['.XXX.', '.XXX.', 'XXXXX', 'XXXXX', '..X..'],
  spades: ['..X..', '.XXX.', 'XXXXX', 'XXXXX', '.X.X.'],
};
const BIG_SUITS: Readonly<Record<Suit, readonly string[]>> = {
  hearts: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  diamonds: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  clubs: ['..XXX..', '..XXX..', 'XX.X.XX', 'XXXXXXX', 'XX.X.XX', '...X...', '..XXX..'],
  spades: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '..X.X..', '.XXXXX.'],
};

type Paper = { readonly top: string; readonly bottom: string; readonly edge: string };

const PAPERS: Readonly<Record<EnhancementId | 'plain', Paper>> = {
  plain: { top: '#fbf6ea', bottom: '#ddd3bd', edge: '#ffffff' },
  golden: { top: '#ffe58a', bottom: '#d99a1e', edge: '#fff6c9' },
  sharp: { top: '#e6f0fb', bottom: '#8ea9c9', edge: '#ffffff' },
  heavy: { top: '#8c7b68', bottom: '#4f4338', edge: '#a8967f' },
  trump: { top: '#d9c2ff', bottom: '#7a4fc0', edge: '#efe4ff' },
  coin: { top: '#d8f5d0', bottom: '#86c777', edge: '#f1fff0' },
};

const GOLD = { Y: '#ffd84a', O: '#c98a12', W: '#fff7cf', R: '#d83a4a', D: '#7a4c06' } as const;

/** Each enhancement gets a symbol that tells its job at a glance. */
const ICONS: Readonly<Record<EnhancementId, { readonly rows: readonly string[]; readonly palette: Readonly<Record<string, string>> }>> = {
  golden: {
    rows: ['....W....', '....Y....', '...YYY...', 'WYYYOYYYW', '..YYOYY..', '...YOY...', '..YY.YY..', '.Y.....Y.', '.........'],
    palette: GOLD,
  },
  sharp: {
    rows: ['.......WS', '......WSD', '.....WSD.', '....WSD..', '.B.WSD...', '..BSD....', '..BB.....', '.B..B....', 'B........'],
    palette: { W: '#ffffff', S: '#9fb6d3', D: '#4a5f7d', B: '#7a4a24' },
  },
  heavy: {
    rows: ['.........', 'LLLLLLL..', 'KLLLLLLLL', '.KKLLLLK.', '...KLLK..', '...KLLK..', '..KLLLLK.', '.KKKKKKKK', '.........'],
    palette: { L: '#c7c0b6', K: '#3a332c' },
  },
  trump: {
    rows: ['.........', 'Y...Y...Y', 'YY.YYY.YY', 'YYYYRYYYY', 'YRYYYYYRY', 'YYYYYYYYY', 'OOOOOOOOO', 'DDDDDDDDD', '.........'],
    palette: GOLD,
  },
  coin: {
    rows: ['...OOO...', '..OYYYO..', '.OYWYYYO.', 'OYWYOYYYO', 'OYYOYOYYO', 'OYYYOYYYO', '.OYYYYYO.', '..OYYYO..', '...OOO...'],
    palette: GOLD,
  },
};

function inside(x: number, y: number): boolean {
  const notch = (x < 2 || x > SPRITE_W - 3) && (y < 2 || y > SPRITE_H - 3);
  return x >= 0 && y >= 0 && x < SPRITE_W && y < SPRITE_H && !notch;
}

function drawBody(grid: Grid, paper: Paper): void {
  const shades = [0, 0.33, 0.66, 1].map((t) => mix(paper.top, paper.bottom, t));
  for (let y = 0; y < SPRITE_H; y++) {
    for (let x = 0; x < SPRITE_W; x++) {
      if (!inside(x, y)) continue;
      const border = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if (border) {
        setPixel(grid, x, y, INK);
        continue;
      }
      const shade = shades[ditherIndex(y / SPRITE_H, shades.length, x, y)] ?? paper.top;
      const lit = !inside(x - 2, y) || !inside(x, y - 2);
      const shadow = !inside(x + 2, y) || !inside(x, y + 2) || !inside(x, y + 3);
      setPixel(grid, x, y, lit ? paper.edge : shadow ? mix(paper.bottom, INK, 0.25) : shade);
    }
  }
}

function drawPattern(grid: Grid, enhancement: EnhancementId | undefined): void {
  if (!enhancement) return;
  for (let y = 3; y < SPRITE_H - 4; y++) {
    for (let x = 3; x < SPRITE_W - 3; x++) {
      const current = getPixel(grid, x, y);
      if (!current) continue;
      if (enhancement === 'sharp' && (x + y) % 9 === 0) setPixel(grid, x, y, mix(current, '#ffffff', 0.7));
      if (enhancement === 'heavy') {
        const row = Math.floor(y / 6);
        const mortar = y % 6 === 0 || (x + (row % 2) * 6) % 12 === 0;
        if (mortar) setPixel(grid, x, y, mix(current, INK, 0.35));
      }
      if (enhancement === 'golden' && (x * 13 + y * 7) % 53 === 0) setPixel(grid, x, y, '#ffffff');
    }
  }
}

function suitShades(ink: string): readonly [string, string, string] {
  return [ink, mix(ink, '#ffffff', 0.4), mix(ink, '#000000', 0.45)];
}

/** The rank is drawn as text by the UI, so the sprite leaves the rank corners empty. */
export function drawFront(card: Card, enhancement?: EnhancementId): Grid {
  const grid = createGrid(SPRITE_W, SPRITE_H);
  drawBody(grid, PAPERS[enhancement ?? 'plain']);
  drawPattern(grid, enhancement);
  const ink = card.suit === 'hearts' || card.suit === 'diamonds' ? RED : INK;
  const [base, light, dark] = suitShades(ink);
  stampShaded(grid, MINI_SUITS[card.suit], 5, 17, 2, base, light, dark);
  stampShaded(grid, BIG_SUITS[card.suit], 14, 26, 3, base, light, dark);
  stampShaded(grid, MINI_SUITS[card.suit], SPRITE_W - 15, SPRITE_H - 27, 2, base, light, dark, true);
  if (enhancement) {
    const icon = ICONS[enhancement];
    stampOutlinedIcon(grid, icon.rows, icon.palette, SPRITE_W - 22, 4, 2, INK);
  }
  return grid;
}

export function drawBack(): Grid {
  const grid = createGrid(SPRITE_W, SPRITE_H);
  drawBody(grid, { top: '#d8343a', bottom: '#8e1a20', edge: '#f06a6a' });
  for (let y = 5; y < SPRITE_H - 5; y++) {
    for (let x = 5; x < SPRITE_W - 5; x++) {
      const frame = x === 5 || y === 5 || x === SPRITE_W - 6 || y === SPRITE_H - 6;
      if (frame) setPixel(grid, x, y, '#f4efe2');
      else if ((Math.floor(x / 3) + Math.floor(y / 3)) % 2 === 0) setPixel(grid, x, y, mix(getPixel(grid, x, y) ?? '#c2292e', '#000000', 0.18));
    }
  }
  return grid;
}

const cache = new Map<string, string>();

function cached(key: string, draw: () => Grid): string {
  const hit = cache.get(key);
  if (hit) return hit;
  const url = toDataUrl(draw());
  cache.set(key, url);
  return url;
}

export function frontUrl(card: Card, enhancement?: EnhancementId): string {
  return cached(`${card.id}:${enhancement ?? '-'}`, () => drawFront(card, enhancement));
}

export function backUrl(): string {
  return cached('back', drawBack);
}

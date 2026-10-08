import type { JokerId } from '@game/durak';
import { createGrid, ditherIndex, mix, setPixel, stampOutlinedIcon, toDataUrl, type Grid } from './pixelArt';

/** 32×32 tile: a 14×14 icon drawn ×2 with a 2 px margin. */
export const EMBLEM_SIZE = 32;
const ICON_SCALE = 2;
const ICON_OFFSET = 2;

const INK = '#1b1426';

export type JokerIcon = { readonly rows: readonly string[]; readonly palette: Readonly<Record<string, string>> };

/** A small picture of what each perk does; '.' is transparent. */
/** Hand-drawn icons (3b draws the rest; placeholders below). */
const DRAWN = {
  serial: {
    palette: { W: '#fbf6ea', R: '#d83a4a', L: '#ffffff' },
    rows: [
      '..............',
      '..............',
      '.......WWWWWW.',
      '.......WRWWWW.',
      '.LLLL..WWWWWW.',
      '.......WWRRWW.',
      '..LLLL.WRRRRW.',
      '.......WRRRRW.',
      '.LLLL..WWRRWW.',
      '.......WWWWWW.',
      '..LLL..WWWWRW.',
      '.......WWWWWW.',
      '..............',
      '..............',
    ],
  },
  thickSkin: {
    palette: { B: '#4a5f7d', S: '#9fb6d3', W: '#ffffff', K: '#2a3446' },
    rows: [
      '..............',
      '..BBBBBBBBBB..',
      '..BSSSSSSSSB..',
      '..BSWWSSSSSB..',
      '..BSWSSSSKSB..',
      '..BSSSSSSSSB..',
      '..BSSSSSSSSB..',
      '..BSKSSSSSSB..',
      '...BSSSSSSB...',
      '...BSSSSSSB...',
      '....BSSSSB....',
      '.....BSSB.....',
      '......BB......',
      '..............',
    ],
  },
  longArms: {
    palette: { W: '#fbf6ea', K: '#1b1426', G: '#3fa36b' },
    rows: [
      '..............',
      '..............',
      '......WWWWWWW.',
      '......WKKKKKW.',
      '..G...WWWWKKW.',
      '..G...WWWKKWW.',
      'GGGGG.WWWKKWW.',
      '..G...WWKKWWW.',
      '..G...WWKKWWW.',
      '......WKKWWWW.',
      '......WKKWWWW.',
      '......WWWWWWW.',
      '..............',
      '..............',
    ],
  },
  cardSharp: {
    palette: { K: '#1b1426', W: '#ffffff', E: '#29adff' },
    rows: [
      '..............',
      '..............',
      '..............',
      '....KKKKKK....',
      '..KKWWWWWWKK..',
      '.KWWWEEEEWWWK.',
      'KWWWEEKKEEWWWK',
      'KWWWEEKKEEWWWK',
      '.KWWWEEEEWWWK.',
      '..KKWWWWWWKK..',
      '....KKKKKK....',
      '..............',
      '..............',
      '..............',
    ],
  },
  looter: {
    palette: { N: '#6b4420', M: '#d9a066', Y: '#ffd84a', O: '#c98a12', W: '#fff7cf' },
    rows: [
      '..............',
      '.....NN.NN....',
      '......NNN.....',
      '.....MMMMM....',
      '....MMMMMMM...',
      '...MMMMMMMMM..',
      '..MMMMYYYMMMM.',
      '..MMMYOOOYMMM.',
      '..MMMYOWOYMMM.',
      '..MMMYOOOYMMM.',
      '..MMMMYYYMMMM.',
      '...MMMMMMMMM..',
      '....NNNNNNN...',
      '..............',
    ],
  },
  piggyBank: {
    palette: { P: '#ffb3c7', Q: '#c2577a', K: '#1b1426', Y: '#ffd84a', O: '#c98a12' },
    rows: [
      '..............',
      '......YYY.....',
      '......YOY.....',
      '......YYY.....',
      '...PPPKKPPP...',
      '..PPPPPPPPPP..',
      '.PPKPPPPPPPPP.',
      '.PPPPPPPPPPQQQ',
      '.PPPPPPPPPPQKQ',
      '.PPPPPPPPPPQQQ',
      '..PPPPPPPPPP..',
      '..QQ.QQ.QQ.QQ.',
      '..QQ.QQ.QQ.QQ.',
      '..............',
    ],
  },
  trumpAce: {
    palette: { Y: '#ffd84a', R: '#d83a4a', O: '#c98a12', D: '#7a4c06' },
    rows: [
      '..............',
      '..............',
      '..............',
      '.Y....Y....Y..',
      '.YY..YYY..YY..',
      '.YYY.YRY.YYY..',
      '.YYYYYYYYYYY..',
      '.YRYYYYYYYRY..',
      '.YYYYYYYYYYY..',
      '.OOOOOOOOOOO..',
      '.DDDDDDDDDDD..',
      '..............',
      '..............',
      '..............',
    ],
  },
  cleanHands: {
    palette: { C: '#2f9e6a', W: '#c9f7e1', L: '#ffffff' },
    rows: [
      '..............',
      '..........W...',
      '.........WCW..',
      '..........W...',
      '...CCCC.......',
      '..CWWWWC......',
      '.CWLWWWWC.....',
      '.CWWWWWWC.....',
      '.CWWWWWWC..CC.',
      '.CWWWWWWC.CWLC',
      '..CWWWWC..CWWC',
      '...CCCC....CC.',
      '..............',
      '..............',
    ],
  },
} satisfies Partial<Record<JokerId, JokerIcon>>;

const SUIT_MASKS = {
  hearts: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  diamonds: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  clubs: ['..XXX..', '..XXX..', 'XX.X.XX', 'XXXXXXX', 'XX.X.XX', '...X...', '..XXX..'],
  spades: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '..X.X..', '.XXXXX.'],
} as const;

/** Doubles a 7×7 suit mask into a one-colour 14×14 icon. */
function suitIcon(mask: readonly string[], color: string): JokerIcon {
  const rows = mask.flatMap((row) => {
    const wide = [...row].map((ch) => (ch === 'X' ? 'SS' : '..')).join('');
    return [wide, wide];
  });
  return { rows, palette: { S: color } };
}

/** Until 3b draws them, these jokers share a question mark (each on its own tile colour). */
const PLACEHOLDER: JokerIcon = {
  palette: { W: '#ffffff' },
  rows: [
    '..............',
    '....WWWWWW....',
    '...WW....WW...',
    '..........WW..',
    '.........WW...',
    '........WW....',
    '.......WW.....',
    '.......WW.....',
    '..............',
    '.......WW.....',
    '.......WW.....',
    '..............',
    '..............',
    '..............',
  ],
};

const RED_SUIT = '#d83a4a';
const BLACK_SUIT = '#1b1426';

export const JOKER_ICONS: Readonly<Record<JokerId, JokerIcon>> = {
  ...DRAWN,
  hearts: suitIcon(SUIT_MASKS.hearts, RED_SUIT),
  diamonds: suitIcon(SUIT_MASKS.diamonds, RED_SUIT),
  clubs: suitIcon(SUIT_MASKS.clubs, BLACK_SUIT),
  spades: suitIcon(SUIT_MASKS.spades, BLACK_SUIT),
  small: PLACEHOLDER,
  gloat: PLACEHOLDER,
  rage: PLACEHOLDER,
  usurer: PLACEHOLDER,
  mirror: PLACEHOLDER,
  collector: PLACEHOLDER,
};

/** Tile colours per perk (top → bottom gradient). */
const TILES: Readonly<Record<JokerId, readonly [string, string]>> = {
  serial: ['#ff7a59', '#b4282d'],
  thickSkin: ['#c9d6e3', '#6f86a1'],
  longArms: ['#7fd0ff', '#2a6fb0'],
  cardSharp: ['#c39bff', '#6a3fb0'],
  looter: ['#f2d49b', '#a8763c'],
  piggyBank: ['#ffe3ea', '#e48aa6'],
  trumpAce: ['#a05ad8', '#4e2380'],
  cleanHands: ['#d8f5ec', '#6cc49c'],
  hearts: ['#ffe9ec', '#f2a7b3'],
  diamonds: ['#fff2e0', '#f5b98a'],
  clubs: ['#eef3ea', '#a9bfa0'],
  spades: ['#eceff7', '#a3acc4'],
  small: ['#ffd27f', '#c98a12'],
  gloat: ['#ff9db1', '#b4285a'],
  rage: ['#ff8a5c', '#a12a1f'],
  usurer: ['#9be0b0', '#2f7d4a'],
  mirror: ['#d6f0ff', '#5a8fb8'],
  collector: ['#ffe3a1', '#8a5a2b'],
}

function inTile(x: number, y: number): boolean {
  const last = EMBLEM_SIZE - 1;
  const corner = (x < 2 || x > last - 2) && (y < 2 || y > last - 2);
  return x >= 0 && y >= 0 && x <= last && y <= last && !corner;
}

function drawTile(grid: Grid, top: string, bottom: string): void {
  const shades = [0, 0.33, 0.66, 1].map((t) => mix(top, bottom, t));
  for (let y = 0; y < EMBLEM_SIZE; y++) {
    for (let x = 0; x < EMBLEM_SIZE; x++) {
      if (!inTile(x, y)) continue;
      const edge = !inTile(x - 1, y) || !inTile(x + 1, y) || !inTile(x, y - 1) || !inTile(x, y + 1);
      setPixel(grid, x, y, edge ? INK : (shades[ditherIndex(y / EMBLEM_SIZE, shades.length, x, y)] ?? top));
    }
  }
}

export function drawJokerEmblem(id: JokerId): Grid {
  const grid = createGrid(EMBLEM_SIZE, EMBLEM_SIZE);
  const [top, bottom] = TILES[id];
  drawTile(grid, top, bottom);
  const icon = JOKER_ICONS[id];
  stampOutlinedIcon(grid, icon.rows, icon.palette, ICON_OFFSET, ICON_OFFSET, ICON_SCALE, INK);
  return grid;
}

const cache = new Map<JokerId, string>();

export function emblemUrl(id: JokerId): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const url = toDataUrl(drawJokerEmblem(id));
  cache.set(id, url);
  return url;
}

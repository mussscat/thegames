import type { PerkId } from '@game/durak';
import { createGrid, ditherIndex, mix, setPixel, stampShaded, toDataUrl, type Grid } from './pixelArt';

export const EMBLEM_SIZE = 16;

const INK = '#1b1426';
const GLYPH = { base: '#f4efe2', light: '#ffffff', dark: '#b8ad98' } as const;

type Emblem = { readonly mask: readonly string[]; readonly top: string; readonly bottom: string };

/** 7×7 masks drawn at ×2: a simple symbol per perk on its own colour tile. */
const EMBLEMS: Readonly<Record<PerkId, Emblem>> = {
  throwMaster: { top: '#ff7a59', bottom: '#b4282d', mask: ['...X...', '...XX..', 'XXXXXX.', 'XXXXXXX', 'XXXXXX.', '...XX..', '...X...'] },
  thickSkin: { top: '#8fa3b8', bottom: '#4a5f7d', mask: ['XXXXXXX', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'] },
  longArms: { top: '#7fd0ff', bottom: '#2a6fb0', mask: ['.......', '.X...X.', 'XX...XX', 'XXXXXXX', 'XX...XX', '.X...X.', '.......'] },
  cardSharp: { top: '#c39bff', bottom: '#6a3fb0', mask: ['.......', '..XXX..', '.XX.XX.', 'XX.X.XX', '.XX.XX.', '..XXX..', '.......'] },
  looter: { top: '#d9a066', bottom: '#8a5a2b', mask: ['..XXX..', '...X...', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.'] },
  piggyBank: { top: '#ffb3c7', bottom: '#c2577a', mask: ['.XXXXX.', 'XXXXXXX', '.XXXXX.', 'XXXXXXX', '.XXXXX.', 'XXXXXXX', '.XXXXX.'] },
  trumpLover: { top: '#ffd84a', bottom: '#c98a12', mask: ['X..X..X', 'XX.X.XX', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.......', 'XXXXXXX'] },
  cleanHands: { top: '#9ef0c8', bottom: '#2f9e6a', mask: ['...X...', '...X...', '..XXX..', 'XXXXXXX', '..XXX..', '...X...', '...X...'] },
};

function inTile(x: number, y: number): boolean {
  const last = EMBLEM_SIZE - 1;
  const corner = (x === 0 || x === last) && (y === 0 || y === last);
  return x >= 0 && y >= 0 && x <= last && y <= last && !corner;
}

export function drawPerkEmblem(id: PerkId): Grid {
  const { mask, top, bottom } = EMBLEMS[id];
  const grid = createGrid(EMBLEM_SIZE, EMBLEM_SIZE);
  const shades = [0, 0.5, 1].map((t) => mix(top, bottom, t));
  for (let y = 0; y < EMBLEM_SIZE; y++) {
    for (let x = 0; x < EMBLEM_SIZE; x++) {
      if (!inTile(x, y)) continue;
      const edge = !inTile(x - 1, y) || !inTile(x + 1, y) || !inTile(x, y - 1) || !inTile(x, y + 1);
      setPixel(grid, x, y, edge ? INK : (shades[ditherIndex(y / EMBLEM_SIZE, shades.length, x, y)] ?? top));
    }
  }
  stampShaded(grid, mask, 1, 1, 2, GLYPH.base, GLYPH.light, GLYPH.dark);
  return grid;
}

const cache = new Map<PerkId, string>();

export function emblemUrl(id: PerkId): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const url = toDataUrl(drawPerkEmblem(id));
  cache.set(id, url);
  return url;
}

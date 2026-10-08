import type { Card, Rank, Suit } from '@game/core';
import type { EnhancementId } from '@game/durak';

/** The whole card is a 35×49 pixel sprite scaled up without smoothing — the Balatro look. */
export const SPRITE_W = 35;
export const SPRITE_H = 49;

const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  '0': ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'],
  '1': ['.X', 'XX', '.X', '.X', '.X'],
  '6': ['XXX', 'X..', 'XXX', 'X.X', 'XXX'],
  '7': ['XXX', '..X', '.X.', '.X.', '.X.'],
  '8': ['XXX', 'X.X', 'XXX', 'X.X', 'XXX'],
  '9': ['XXX', 'X.X', 'XXX', '..X', 'XXX'],
  В: ['XX.', 'X.X', 'XX.', 'X.X', 'XX.'],
  Д: ['.XX.', '.XX.', '.XX.', 'XXXX', 'X..X'],
  К: ['X.X', 'X.X', 'XX.', 'X.X', 'X.X'],
  Т: ['XXX', '.X.', '.X.', '.X.', '.X.'],
};

const RANK_TEXT: Readonly<Record<number, string>> = { 11: 'В', 12: 'Д', 13: 'К', 14: 'Т' };

const MINI_SUITS: Readonly<Record<Suit, readonly string[]>> = {
  hearts: ['XX.XX', 'XXXXX', 'XXXXX', '.XXX.', '..X..'],
  diamonds: ['..X..', '.XXX.', 'XXXXX', '.XXX.', '..X..'],
  clubs: ['..X..', '.XXX.', 'X.X.X', 'XXXXX', '..X..'],
  spades: ['..X..', '.XXX.', 'XXXXX', 'XXXXX', '..X..'],
};

const BIG_SUITS: Readonly<Record<Suit, readonly string[]>> = {
  hearts: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  diamonds: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  clubs: ['..XXX..', '..XXX..', 'XX.X.XX', 'XXXXXXX', 'XX.X.XX', '...X...', '..XXX..'],
  spades: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '..X.X..', '.XXXXX.'],
};

type Pixel = { readonly x: number; readonly y: number; readonly color: string };

const INK = '#1b1426';
const RED = '#c2292e';

/** Paper colour and a texture accent for each enhancement, like Balatro's card enhancements. */
const PAPER: Readonly<Record<EnhancementId | 'plain', { readonly base: string; readonly shade: string; readonly accent?: string }>> = {
  plain: { base: '#f4efe2', shade: '#d9d1bd' },
  golden: { base: '#f2c94c', shade: '#c99a22', accent: '#fff1a8' },
  sharp: { base: '#c9d3e0', shade: '#8f9db3', accent: '#eef3fa' },
  heavy: { base: '#a89c8a', shade: '#7d7262', accent: '#c4b8a4' },
  trump: { base: '#d8c3f0', shade: '#a487c9', accent: '#f1e6ff' },
  coin: { base: '#bfe3b0', shade: '#84b874', accent: '#f2c94c' },
};

function stamp(mask: readonly string[], ox: number, oy: number, color: string, scale = 1, flip = false): Pixel[] {
  const h = mask.length;
  const w = mask[0]?.length ?? 0;
  return mask.flatMap((row, y) =>
    [...row].flatMap((cell, x) => {
      if (cell !== 'X') return [];
      const px = flip ? w - 1 - x : x;
      const py = flip ? h - 1 - y : y;
      return Array.from({ length: scale * scale }, (_, i) => ({ x: ox + px * scale + (i % scale), y: oy + py * scale + Math.floor(i / scale), color }));
    }),
  );
}

function rankPixels(rank: Rank, ox: number, oy: number, color: string, flip: boolean): Pixel[] {
  const text = RANK_TEXT[rank] ?? String(rank);
  const glyphs = [...text].map((ch) => GLYPHS[ch] ?? GLYPHS['0']!);
  const widths = glyphs.map((g) => g[0]?.length ?? 3);
  const total = widths.reduce((a, b) => a + b, 0) + glyphs.length - 1;
  let cursor = flip ? ox - total + 1 : ox;
  return glyphs.flatMap((glyph, i) => {
    const pixels = stamp(glyph, cursor, flip ? oy - 4 : oy, color, 1, flip);
    cursor += (widths[i] ?? 3) + 1;
    return pixels;
  });
}

function frame(base: string, shade: string, accent: string | undefined, enhancement: EnhancementId | undefined): Pixel[] {
  const pixels: Pixel[] = [];
  for (let y = 0; y < SPRITE_H; y++) {
    for (let x = 0; x < SPRITE_W; x++) {
      const corner = (x === 0 || x === SPRITE_W - 1) && (y === 0 || y === SPRITE_H - 1);
      if (corner) continue;
      const edge = x === 0 || y === 0 || x === SPRITE_W - 1 || y === SPRITE_H - 1;
      const innerCorner = (x === 1 || x === SPRITE_W - 2) && (y === 1 || y === SPRITE_H - 2);
      let color = edge || innerCorner ? INK : base;
      if (!edge && y >= SPRITE_H - 3) color = shade;
      if (!edge && accent && enhancement === 'sharp' && (x + y) % 6 === 0) color = accent;
      if (!edge && accent && enhancement === 'heavy' && (x * 7 + y * 3) % 11 === 0) color = shade;
      if (!edge && accent && (enhancement === 'golden' || enhancement === 'trump') && (x === 2 || y === 2) && !innerCorner) color = accent;
      pixels.push({ x, y, color });
    }
  }
  return pixels;
}

export function frontPixels(card: Card, enhancement?: EnhancementId): readonly Pixel[] {
  const paper = PAPER[enhancement ?? 'plain'];
  const ink = card.suit === 'hearts' || card.suit === 'diamonds' ? RED : INK;
  const coin = enhancement === 'coin' ? stamp(['.XX.', 'XXXX', 'XXXX', '.XX.'], SPRITE_W - 7, 3, '#e0a91b') : [];
  return [
    ...frame(paper.base, paper.shade, paper.accent, enhancement),
    ...rankPixels(card.rank, 3, 3, ink, false),
    ...stamp(MINI_SUITS[card.suit], 3, 9, ink),
    ...stamp(BIG_SUITS[card.suit], 8, 14, ink, 3),
    ...rankPixels(card.rank, SPRITE_W - 4, SPRITE_H - 4, ink, true),
    ...stamp(MINI_SUITS[card.suit], SPRITE_W - 8, SPRITE_H - 14, ink, 1, true),
    ...coin,
  ];
}

export function backPixels(): readonly Pixel[] {
  const pixels = frame('#c2292e', '#9c1f25', undefined, undefined);
  return pixels.map((p) => {
    const inner = p.x >= 3 && p.x <= SPRITE_W - 4 && p.y >= 3 && p.y <= SPRITE_H - 4;
    const border = p.x === 2 || p.y === 2 || p.x === SPRITE_W - 3 || p.y === SPRITE_H - 3;
    if (p.color === INK) return p;
    if (border && p.x > 1 && p.y > 1 && p.x < SPRITE_W - 2 && p.y < SPRITE_H - 2) return { ...p, color: '#f4efe2' };
    if (inner) return { ...p, color: (Math.floor(p.x / 2) + Math.floor(p.y / 2)) % 2 === 0 ? '#c2292e' : '#9c1f25' };
    return p;
  });
}

export function SpriteSvg({ pixels }: { readonly pixels: readonly Pixel[] }) {
  return (
    <svg className="sprite" viewBox={`0 0 ${SPRITE_W} ${SPRITE_H}`} shapeRendering="crispEdges" aria-hidden="true">
      {pixels.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={1} height={1} fill={p.color} />
      ))}
    </svg>
  );
}

import type { Suit } from '@game/core';

/** 7×7 pixel masks: X = filled. Drawn as crisp SVG rects so they scale without blur. */
const SUIT_PIXELS: Readonly<Record<Suit, readonly string[]>> = {
  hearts: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  diamonds: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  clubs: ['..XXX..', '..XXX..', 'XX.X.XX', 'XXXXXXX', 'XX.X.XX', '...X...', '..XXX..'],
  spades: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '..X.X..', '.XXXXX.'],
};

type PixelSuitProps = { readonly suit: Suit; readonly size: number; readonly color: string };

export function PixelSuit({ suit, size, color }: PixelSuitProps) {
  const rows = SUIT_PIXELS[suit];
  return (
    <svg width={size} height={size} viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((row, y) =>
        [...row].map((cell, x) => (cell === 'X' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} /> : null)),
      )}
    </svg>
  );
}

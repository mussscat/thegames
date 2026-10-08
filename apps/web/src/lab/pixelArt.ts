/** A tiny pixel canvas: colours per pixel, rendered once to a PNG data URL. */
export type Grid = { readonly w: number; readonly h: number; readonly data: (string | null)[] };

export function createGrid(w: number, h: number): Grid {
  return { w, h, data: Array.from({ length: w * h }, () => null) };
}

export function setPixel(grid: Grid, x: number, y: number, color: string): void {
  if (x < 0 || y < 0 || x >= grid.w || y >= grid.h) return;
  grid.data[y * grid.w + x] = color;
}

export function getPixel(grid: Grid, x: number, y: number): string | null {
  if (x < 0 || y < 0 || x >= grid.w || y >= grid.h) return null;
  return grid.data[y * grid.w + x] ?? null;
}

export function toDataUrl(grid: Grid): string {
  const canvas = document.createElement('canvas');
  canvas.width = grid.w;
  canvas.height = grid.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  grid.data.forEach((color, i) => {
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(i % grid.w, Math.floor(i / grid.w), 1, 1);
  });
  return canvas.toDataURL('image/png');
}

function channels(hex: string): readonly [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

/** Ordered dithering between palette steps: soft gradients made of hard pixels. */
export function ditherIndex(t: number, steps: number, x: number, y: number): number {
  const threshold = (BAYER_4[y % 4]?.[x % 4] ?? 0) / 16;
  return Math.min(steps - 1, Math.floor(t * (steps - 1) + threshold));
}

/**
 * Stamps a mask scaled up and shades it: lit edges where the shape faces up/left,
 * shaded edges where it faces down/right — the bevel that gives pixel art its volume.
 */
export function stampShaded(
  grid: Grid,
  mask: readonly string[],
  ox: number,
  oy: number,
  scale: number,
  base: string,
  light: string,
  dark: string,
  flip = false,
): void {
  const h = mask.length * scale;
  const w = (mask[0]?.length ?? 0) * scale;
  const filled = (sx: number, sy: number): boolean => {
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) return false;
    const mx = Math.floor(sx / scale);
    const my = Math.floor(sy / scale);
    const row = mask[flip ? mask.length - 1 - my : my] ?? '';
    return row[flip ? row.length - 1 - mx : mx] === 'X';
  };
  for (let sy = 0; sy < h; sy++) {
    for (let sx = 0; sx < w; sx++) {
      if (!filled(sx, sy)) continue;
      let color = base;
      if (!filled(sx, sy + 1) || !filled(sx + 1, sy)) color = dark;
      else if (!filled(sx, sy - 1) || !filled(sx - 1, sy)) color = light;
      setPixel(grid, ox + sx, oy + sy, color);
    }
  }
}

/** Multi-colour icon: each letter maps to a palette colour, '.' is transparent. */
export function stampIcon(grid: Grid, rows: readonly string[], palette: Readonly<Record<string, string>>, ox: number, oy: number, scale: number): void {
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const color = palette[ch];
      if (!color) return;
      for (let i = 0; i < scale * scale; i++) setPixel(grid, ox + x * scale + (i % scale), oy + y * scale + Math.floor(i / scale), color);
    }),
  );
}

/** Stamps an icon with a 1-px dark outline so it reads on any paper colour. */
export function stampOutlinedIcon(
  grid: Grid,
  rows: readonly string[],
  palette: Readonly<Record<string, string>>,
  ox: number,
  oy: number,
  scale: number,
  outline: string,
): void {
  const layer = createGrid(grid.w, grid.h);
  stampIcon(layer, rows, palette, ox, oy, scale);
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      if (getPixel(layer, x, y)) continue;
      const touches = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => getPixel(layer, x + (dx ?? 0), y + (dy ?? 0)));
      if (touches && getPixel(grid, x, y)) setPixel(grid, x, y, outline);
    }
  }
  layer.data.forEach((color, i) => {
    if (color) setPixel(grid, i % grid.w, Math.floor(i / grid.w), color);
  });
}

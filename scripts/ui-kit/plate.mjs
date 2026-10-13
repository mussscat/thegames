/**
 * A Balatro-style plate: a stepped corner (`insets[i]` transparent pixels on row i from each side), a 1 px outline that
 * follows the shape, a flat fill, a 1 px darker inner edge and a thick dark lip along the bottom. No light bevel; the only
 * highlight is an optional single row under the top outline. Pure: same input, same pixels.
 */
export function plate(w, h, { insets, outline, fill, edge, lip = 0, lipColor, top }) {
  const inset = (y) => insets[Math.min(y, h - 1 - y)] ?? 0;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && x >= inset(y) && x < w - inset(y);
  const pixels = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(x, y)) pixels.push([0, 0, 0, 0]);
      else if (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)) pixels.push(outline);
      else if (y >= h - 1 - lip) pixels.push(lipColor);
      else if (top && y === 1) pixels.push(top);
      else if (!solid(x - 1, y - 1) || !solid(x + 1, y - 1) || !solid(x - 1, y + 1) || !solid(x + 1, y + 1) || x === 1 || x === w - 2 || y === 1) pixels.push(edge);
      else pixels.push(fill);
    }
  }
  return pixels;
}

/** Paints a bitmap (rows of `#` and `.`) onto `pixels` (w wide) with its top-left at (x0, y0); returns a new array. */
export function stamp(pixels, w, rows, x0, y0, color) {
  const out = pixels.slice();
  rows.forEach((row, dy) => {
    [...row].forEach((ch, dx) => {
      if (ch === '#') out[(y0 + dy) * w + x0 + dx] = color;
    });
  });
  return out;
}

/** A filled circle `d` px across: 1 px outline, flat face, light upper-left crescent, dark lower-right crescent. */
export function disc(d, { outline, face, light, dark }) {
  const c = (d - 1) / 2;
  const r = d / 2;
  const inside = (x, y) => (x - c) ** 2 + (y - c) ** 2 <= r * r - 0.25;
  const pixels = [];
  for (let y = 0; y < d; y++) {
    for (let x = 0; x < d; x++) {
      if (!inside(x, y)) pixels.push([0, 0, 0, 0]);
      else if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) pixels.push(outline);
      else if (x + y <= c * 0.9 + 1) pixels.push(light);
      else if (x + y >= d * 2 - c * 0.9 - 3) pixels.push(dark);
      else pixels.push(face);
    }
  }
  return pixels;
}

/** Pastes the opaque pixels of `top` (tw wide) onto `base` (bw wide) at (x0, y0); returns a new array. */
export function paste(base, bw, top, tw, x0, y0) {
  const out = base.slice();
  top.forEach((p, i) => {
    if (p[3] === 0) return;
    out[(y0 + Math.floor(i / tw)) * bw + x0 + (i % tw)] = p;
  });
  return out;
}

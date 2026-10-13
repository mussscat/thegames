// Generates the TEMPORARY pixel UI kit used by the ?lab «Пиксели» pilot tab.
// Flat colours, hard edges, no antialiasing — the real kit will replace these files under the same names.
// Usage: node scripts/gen-pilot-kit.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../apps/web/src/lab/pixel/kit');

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 255];

const C = {
  ink: hex('#1b1426'),
  panelLight: hex('#4a5d9a'),
  panelFill: hex('#2b3a67'),
  panelEdge: hex('#243357'),
  panelDark: hex('#1d2b53'),
  redLight: hex('#f08585'),
  redFace: hex('#d9393f'),
  redDark: hex('#8a1f2a'),
  greyLight: hex('#7b7b8e'),
  greyFace: hex('#5b5b6b'),
  greyDark: hex('#3a3a48'),
  trackFill: hex('#140f1e'),
  trackDark: hex('#0b0812'),
};

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
};

/** RGBA pixels (array of [r,g,b,a] rows) → PNG buffer. */
function encodePng(w, h, pixels) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) Buffer.from(pixels[y * w + x]).copy(raw, y * (w * 4 + 1) + 1 + x * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Balatro-style plate: a stepped corner (`insets[i]` transparent pixels on row i from each side), a 1 px ink outline
 * that follows the shape, a flat fill, a 1 px darker inner edge and a thick dark lip along the bottom.
 * No light bevel: the only highlight is an optional single row under the top outline.
 */
function plate(w, h, { insets, fill, edge, lip = 0, lipColor, top }) {
  const inset = (y) => insets[Math.min(y, h - 1 - y)] ?? 0;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && x >= inset(y) && x < w - inset(y);
  const pixels = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(x, y)) pixels.push([0, 0, 0, 0]);
      else if (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)) pixels.push(C.ink);
      else if (y >= h - 1 - lip) pixels.push(lipColor);
      else if (top && y === 1) pixels.push(top);
      else if (!solid(x - 1, y - 1) || !solid(x + 1, y - 1) || !solid(x - 1, y + 1) || !solid(x + 1, y + 1) || x === 1 || x === w - 2 || y === 1) pixels.push(edge);
      else pixels.push(fill);
    }
  }
  return pixels;
}

const write = (name, w, h, pixels) => writeFileSync(join(OUT, name), encodePng(w, h, pixels));

mkdirSync(OUT, { recursive: true });

// Panel: 24×24, slice 6. The 3-1-1 staircase corner; the lip is the dark band under the plate.
write('panel.png', 24, 24, plate(24, 24, { insets: [3, 1, 1], fill: C.panelFill, edge: C.panelEdge, lip: 2, lipColor: C.panelDark }));

// Button: 16×24, slice 4 top / 5 bottom. Pressed keeps the same size; the lip shrinks to 1 row.
write('button.png', 16, 24, plate(16, 24, { insets: [2, 1], fill: C.redFace, edge: C.redFace, lip: 3, lipColor: C.redDark, top: C.redLight }));
write('button-pressed.png', 16, 24, plate(16, 24, { insets: [2, 1], fill: C.redFace, edge: C.redFace, lip: 1, lipColor: C.redDark }));
write('button-disabled.png', 16, 24, plate(16, 24, { insets: [2, 1], fill: C.greyFace, edge: C.greyFace, lip: 3, lipColor: C.greyDark, top: C.greyLight }));

// HP frame: 12×9, slice 3. The fill is a plain div whose width is a whole number of art pixels.
write('hp-frame.png', 12, 9, plate(12, 9, { insets: [2, 1], fill: C.trackFill, edge: C.trackDark, lip: 0, lipColor: C.trackDark }));

console.log(`pilot kit written to ${OUT}`);

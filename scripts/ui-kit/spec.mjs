import { disc, paste, plate, stamp } from './plate.mjs';

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 255];

/** The kit palette; the final palette.json of the project will contain these colours. */
const P = {
  ink: hex('#1b1426'),
  white: hex('#f4ecff'),
  gold: hex('#f2c94c'),
  panelFill: hex('#2b3a67'),
  panelEdge: hex('#243357'),
  panelDark: hex('#1d2b53'),
  panelLight: hex('#4a5d9a'),
  wellFill: hex('#140f1e'),
  wellEdge: hex('#0b0812'),
  tipFill: hex('#241a38'),
  tipEdge: hex('#3a2e52'),
  shortFill: hex('#3a1418'),
  shortEdge: hex('#5a1f26'),
  shortLine: hex('#c93a43'),
  redLight: hex('#f08585'),
  redFace: hex('#d9393f'),
  redDark: hex('#8a1f2a'),
  blueLight: hex('#8db8f5'),
  blueFace: hex('#3a7bd5'),
  blueDark: hex('#22509c'),
  orangeLight: hex('#f8c37a'),
  orangeFace: hex('#f39c32'),
  orangeDark: hex('#b46a10'),
  greenLight: hex('#8fdcae'),
  greenFace: hex('#3fa36b'),
  greenDark: hex('#22693f'),
  greyLight: hex('#7b7b8e'),
  greyFace: hex('#5b5b6b'),
  greyDark: hex('#3a3a48'),
  coinLight: hex('#fff0a0'),
  coinDark: hex('#b46a10'),
  commonFace: hex('#6b7a9a'),
  rareFace: hex('#3a7bd5'),
  legendaryFace: hex('#f39c32'),
};

const TONES = {
  blue: { light: P.blueLight, face: P.blueFace, dark: P.blueDark },
  red: { light: P.redLight, face: P.redFace, dark: P.redDark },
  orange: { light: P.orangeLight, face: P.orangeFace, dark: P.orangeDark },
  green: { light: P.greenLight, face: P.greenFace, dark: P.greenDark },
};
const GREY = { light: P.greyLight, face: P.greyFace, dark: P.greyDark };

/** Large buttons are 44 art px high, small ones 36 (owner: big targets, nothing to aim at; text is 22 px). */
const BUTTON_SIZES = {
  l: { w: 16, h: 44, insets: [3, 1, 1], lip: 4, corner: 5 },
  s: { w: 16, h: 36, insets: [2, 1], lip: 3, corner: 4 },
};

const GLYPHS = {
  close: ['##.....##', '###...###', '.###.###.', '..#####..', '...###...', '..#####..', '.###.###.', '###...###', '##.....##'],
  'arrow-left': ['....##', '...###', '..###.', '.###..', '###...', '.###..', '..###.', '...###', '....##'],
  'arrow-right': ['##....', '###...', '.###..', '..###.', '...###', '..###.', '.###..', '###...', '##....'],
};

const el = (name, w, h, pixels, slice = null) => ({ name, w, h, slice, pixels });

function button(tone, size, state) {
  const s = BUTTON_SIZES[size];
  const colors = state === 'disabled' ? GREY : TONES[tone];
  const pressed = state === 'pressed';
  const pixels = plate(s.w, s.h, {
    insets: s.insets,
    outline: P.ink,
    fill: colors.face,
    edge: colors.face,
    lip: pressed ? 1 : s.lip,
    lipColor: colors.dark,
    top: pressed ? undefined : colors.light,
  });
  return el(`button-${tone}-${size}-${state}`, s.w, s.h, pixels, [s.corner, s.corner, s.corner + s.lip, s.corner]);
}

function iconButton(name, state) {
  const c = TONES.blue;
  const pressed = state === 'pressed';
  const base = plate(32, 32, { insets: [3, 1, 1], outline: P.ink, fill: c.face, edge: c.face, lip: pressed ? 1 : 3, lipColor: c.dark, top: pressed ? undefined : c.light });
  const glyph = GLYPHS[name];
  const gw = glyph[0].length;
  const x0 = Math.floor((32 - gw) / 2);
  const y0 = Math.floor((32 - 3 - glyph.length) / 2) + 1 + (pressed ? 2 : 0);
  return el(`${name}-${state}`, 32, 32, stamp(base, 32, glyph, x0, y0, P.white));
}

function tipArrow(direction) {
  const rows = { down: ['#######', '.#####.', '..###..', '...#...'], up: ['...#...', '..###..', '.#####.', '#######'] }[direction];
  const w = 7;
  const pixels = Array.from({ length: w * rows.length }, () => [0, 0, 0, 0]);
  return el(`tip-arrow-${direction}`, w, rows.length, stamp(pixels, w, rows, 0, 0, P.white));
}

const HEART = [
  '..###.###..',
  '.#lrr#rrR#.',
  '#lrrrrrrrR#',
  '#rrrrrrrrR#',
  '#rrrrrrrRR#',
  '.#rrrrrrR#.',
  '..#rrrrR#..',
  '...#rrR#...',
  '....#R#....',
  '.....#.....',
];

const SKULL = [
  '..#######..',
  '.#wwwwwww#.',
  '#wwwwwwwww#',
  '#wwwwwwwww#',
  '#w###w###w#',
  '#w###w###w#',
  '#wwwwwwwww#',
  '.#wwwwwww#.',
  '..#w#w#w#..',
  '..#######..',
];

function bitmap(rows, colors) {
  return rows.flatMap((row) => [...row].map((ch) => colors[ch] ?? [0, 0, 0, 0]));
}

function icons() {
  const heart = el('icon-heart', 11, 10, bitmap(HEART, { '#': P.ink, l: P.redLight, r: P.redFace, R: P.redDark }));
  const coin = el('icon-coin', 12, 12, disc(12, { outline: P.ink, face: P.gold, light: P.coinLight, dark: P.coinDark }));
  const chipBase = disc(16, { outline: P.ink, face: P.blueFace, light: P.blueLight, dark: P.blueDark });
  const ring = chipBase.map((p, i) => {
    const x = i % 16;
    const y = Math.floor(i / 16);
    const d = Math.hypot(x - 7.5, y - 7.5);
    return p[3] !== 0 && d > 3.4 && d < 4.6 ? P.white : p;
  });
  const chip = el('icon-chip', 16, 16, ring);
  const cross = ['##.....##', '###...###', '.###.###.', '..#####..', '...###...', '..#####..', '.###.###.', '###...###', '##.....##'];
  const empty = Array.from({ length: 81 }, () => [0, 0, 0, 0]);
  const mult = el('icon-mult', 9, 9, stamp(empty, 9, cross, 0, 0, P.redFace));
  const card = plate(12, 16, { insets: [1], outline: P.ink, fill: P.blueFace, edge: P.blueDark, lip: 0, lipColor: P.blueDark, top: P.blueLight });
  let deckPixels = Array.from({ length: 14 * 18 }, () => [0, 0, 0, 0]);
  for (const [dx, dy] of [[0, 2], [1, 1], [2, 0]]) deckPixels = paste(deckPixels, 14, card, 12, dx, dy);
  const skull = el('icon-skull', 11, 10, bitmap(SKULL, { '#': P.ink, w: P.white }));
  return [el('icon-deck', 14, 18, deckPixels), chip, mult, heart, coin, skull];
}

/** Every element of the temporary UI kit: `{ name, w, h, slice: [top, right, bottom, left] | null, pixels }`. */
export function buildKit() {
  const kit = [];
  kit.push(el('panel', 24, 24, plate(24, 24, { insets: [3, 1, 1], outline: P.ink, fill: P.panelFill, edge: P.panelEdge, lip: 2, lipColor: P.panelDark }), [6, 6, 6, 6]));
  kit.push(el('window', 32, 32, plate(32, 32, { insets: [4, 2, 1, 1], outline: P.ink, fill: P.panelFill, edge: P.panelEdge, lip: 3, lipColor: P.panelDark, top: P.panelLight }), [8, 8, 8, 8]));
  kit.push(el('tip', 16, 16, plate(16, 16, { insets: [2, 1], outline: P.white, fill: P.tipFill, edge: P.tipEdge, lip: 0, lipColor: P.tipEdge }), [5, 5, 5, 5]));
  kit.push(tipArrow('down'), tipArrow('up'));
  kit.push(el('hp-frame', 12, 9, plate(12, 9, { insets: [2, 1], outline: P.ink, fill: P.wellFill, edge: P.wellEdge, lip: 0, lipColor: P.wellEdge }), [3, 3, 3, 3]));
  kit.push(el('price-ok', 12, 12, plate(12, 12, { insets: [2, 1], outline: P.ink, fill: P.wellFill, edge: P.wellEdge, lip: 0, lipColor: P.wellEdge }), [3, 3, 3, 3]));
  kit.push(el('price-short', 12, 12, plate(12, 12, { insets: [2, 1], outline: P.shortLine, fill: P.shortFill, edge: P.shortEdge, lip: 0, lipColor: P.shortEdge }), [3, 3, 3, 3]));
  kit.push(el('slot-empty', 12, 12, plate(12, 12, { insets: [2, 1], outline: P.ink, fill: P.wellFill, edge: P.wellEdge, lip: 0, lipColor: P.wellEdge }), [4, 4, 4, 4]));
  kit.push(el('slot-filled', 12, 12, plate(12, 12, { insets: [2, 1], outline: P.ink, fill: P.panelFill, edge: P.panelEdge, lip: 0, lipColor: P.panelEdge }), [4, 4, 4, 4]));
  kit.push(el('slot-selected', 12, 12, plate(12, 12, { insets: [2, 1], outline: P.gold, fill: P.panelFill, edge: P.panelLight, lip: 0, lipColor: P.panelEdge }), [4, 4, 4, 4]));
  for (const [rarity, face] of [['common', P.commonFace], ['rare', P.rareFace], ['legendary', P.legendaryFace]]) {
    kit.push(el(`badge-${rarity}`, 10, 10, plate(10, 10, { insets: [1], outline: P.ink, fill: face, edge: face, lip: 0, lipColor: face }), [3, 3, 3, 3]));
  }
  const divider = [];
  for (let y = 0; y < 3; y++) for (let x = 0; x < 12; x++) divider.push([P.ink, P.panelLight, P.ink][y]);
  kit.push(el('divider', 12, 3, divider, [0, 4, 0, 4]));
  for (const tone of Object.keys(TONES)) for (const size of Object.keys(BUTTON_SIZES)) for (const state of ['normal', 'pressed', 'disabled']) kit.push(button(tone, size, state));
  for (const name of Object.keys(GLYPHS)) for (const state of ['normal', 'pressed']) kit.push(iconButton(name, state));
  kit.push(...icons());
  return kit;
}

buildKit.palette = Object.values(P);

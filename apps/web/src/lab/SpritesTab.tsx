import { isRedSuit, makeCard, rankLabel, type Card } from '@game/core';
import { ENHANCEMENT_IDS, type EnhancementId } from '@game/durak';
import { useEffect, useMemo, useState } from 'react';
import sheetUrl from '../assets/enhancements.png';
import { PixelCard } from '../ui/PixelCard';
import { MINI_SUITS } from '../ui/pixel/cardSprite';
import { createGrid, getPixel, setPixel, toDataUrl, type Grid } from '../ui/pixel/pixelArt';
import { crop, dropColumns, dropRows, ENHANCEMENT_FRAMES, loadPixels, pixelsToUrl, repeatColumns, type Pixels } from '../ui/pixel/sheet';
import { LabSelect } from './LabSelect';

const range = (from: number, to: number): readonly number[] => Array.from({ length: to - from }, (_, i) => from + i);

type Fit = 'native' | 'cutRows' | 'widen';
const FITS: readonly { readonly id: Fit; readonly name: string; readonly note: string }[] = [
  { id: 'native', name: 'A. 3:5 как есть', note: '62×104, пиксели 1:1. Все карты станут выше на ~20%.' },
  { id: 'cutRows', name: 'B. 5:7 — срез строк', note: '62×87: убраны 8 строк над эмблемой и 9 под ней.' },
  { id: 'widen', name: 'C. 5:7 — расширение', note: '74×104: продублированы 6 столбцов слева и 6 справа от эмблемы.' },
];

/** Every frame to 62 px wide (two of them are 63), then the chosen fit. */
function fitSprite(raw: Pixels, fit: Fit): Pixels {
  const even = raw.w > 62 ? dropColumns(raw, [4]) : raw;
  if (fit === 'cutRows') return dropRows(even, [...range(8, 16), ...range(86, 95)]);
  if (fit === 'widen') return repeatColumns(even, [...range(5, 11), ...range(52, 58)]);
  return even;
}

type Corner = 'bare' | 'outline' | 'plate';
const CORNERS: readonly { readonly id: Corner; readonly name: string }[] = [
  { id: 'plate', name: 'Бумажная плашка' },
  { id: 'outline', name: 'Белая обводка' },
  { id: 'bare', name: 'Без подложки' },
];

const INK = '#1b1426';
const RED = '#c2292e';
const PAPER = '#fbf6ea';
/** Corner column: the rank and the suit are centred on it. */
const CORNER_X = 3;
const CORNER_W = 18;
const SUIT = 10;

function stampMask(grid: Grid, rows: readonly string[], ox: number, oy: number, color: string, flip: boolean): void {
  rows.forEach((row, my) =>
    [...row].forEach((ch, mx) => {
      if (ch !== 'X') return;
      const x = flip ? row.length - 1 - mx : mx;
      const y = flip ? rows.length - 1 - my : my;
      for (let i = 0; i < 4; i++) setPixel(grid, ox + x * 2 + (i % 2), oy + y * 2 + Math.floor(i / 2), color);
    }),
  );
}

function outline(grid: Grid, color: string): void {
  const ring: [number, number][] = [];
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      if (getPixel(grid, x, y)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => getPixel(grid, x + (dx ?? 0), y + (dy ?? 0)))) ring.push([x, y]);
    }
  }
  ring.forEach(([x, y]) => setPixel(grid, x, y, color));
}

function plate(grid: Grid, x0: number, y0: number, w: number, h: number): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const corner = (x === x0 || x === x0 + w - 1) && (y === y0 || y === y0 + h - 1);
      if (corner) continue;
      const edge = x === x0 || x === x0 + w - 1 || y === y0 || y === y0 + h - 1;
      setPixel(grid, x, y, edge ? INK : PAPER);
    }
  }
}

/** Transparent layer: the suit in two corners, plus the paper plate under rank + suit if chosen. */
function cornerLayer(card: Card, w: number, h: number, corner: Corner, suitY: number): string {
  const grid = createGrid(w, h);
  const plateH = suitY + SUIT + 4;
  if (corner === 'plate') {
    plate(grid, CORNER_X, CORNER_X, CORNER_W, plateH);
    plate(grid, w - CORNER_X - CORNER_W, h - CORNER_X - plateH, CORNER_W, plateH);
  }
  const suits = createGrid(w, h);
  const ink = isRedSuit(card.suit) ? RED : INK;
  const inset = CORNER_X + (CORNER_W - SUIT) / 2;
  stampMask(suits, MINI_SUITS[card.suit], inset, CORNER_X + suitY, ink, false);
  stampMask(suits, MINI_SUITS[card.suit], w - inset - SUIT, h - CORNER_X - suitY - SUIT, ink, true);
  if (corner === 'outline') outline(suits, '#ffffff');
  suits.data.forEach((color, i) => {
    if (color) setPixel(grid, i % w, Math.floor(i / w), color);
  });
  return toDataUrl(grid);
}

type SpriteCardProps = {
  readonly card: Card;
  readonly art: Pixels;
  readonly url: string;
  readonly width: number;
  readonly corner: Corner;
  readonly suitY: number;
  /** Rank font size, em of the card's base font. */
  readonly rankEm: number;
  /** Split card: the opponent's half, clipped diagonally like in the hand. */
  readonly foreignUrl?: string;
};

function SpriteCard({ card, art, url, width, corner, suitY, rankEm, foreignUrl }: SpriteCardProps) {
  const overlay = useMemo(() => cornerLayer(card, art.w, art.h, corner, suitY), [card, art.w, art.h, corner, suitY]);
  const rankClass = ['face__rank', 'sprites__rank', isRedSuit(card.suit) ? 'face__rank--red' : '', corner === 'outline' ? 'sprites__rank--outline' : '']
    .filter(Boolean)
    .join(' ');
  const centre = `${((CORNER_X + CORNER_W / 2) / art.w) * 100}%`;
  const rank = rankLabel(card.rank);
  return (
    <div className="sprites__card" style={{ width, fontSize: width * 0.2, aspectRatio: `${art.w} / ${art.h}` }}>
      <img className={foreignUrl ? 'sprite face__sprite face__sprite--own' : 'sprite face__sprite'} src={url} alt="" draggable={false} />
      {foreignUrl && <img className="sprite face__sprite face__sprite--foreign" src={foreignUrl} alt="" draggable={false} />}
      <img className="sprite face__sprite" src={overlay} alt="" draggable={false} />
      <span className={rankClass} style={{ fontSize: `${rankEm}em`, left: centre, top: `${((CORNER_X + 2) / art.h) * 100}%` }}>
        {rank}
      </span>
      <span className={`${rankClass} sprites__rank--bottom`} style={{ fontSize: `${rankEm}em`, left: `calc(100% - ${centre})`, bottom: `${((CORNER_X + 2) / art.h) * 100}%` }}>
        {rank}
      </span>
    </div>
  );
}

const HERO = makeCard('hearts', 12);
const HAND: readonly Card[] = [makeCard('spades', 10), makeCard('clubs', 9), makeCard('diamonds', 14), makeCard('hearts', 7), makeCard('spades', 13), makeCard('clubs', 6)];

type Art = Readonly<Record<EnhancementId, { readonly art: Pixels; readonly url: string }>>;

function buildArts(sheet: Pixels): Readonly<Record<Fit, Art>> {
  const forFit = (fit: Fit): Art =>
    Object.fromEntries(
      ENHANCEMENT_IDS.map((id) => {
        const art = fitSprite(crop(sheet, ENHANCEMENT_FRAMES[id]), fit);
        return [id, { art, url: pixelsToUrl(art) }];
      }),
    ) as Art;
  return { native: forFit('native'), cutRows: forFit('cutRows'), widen: forFit('widen') };
}

/** Compares ways to fit the 3:5 enhancement sprites to the card, with rank and suit drawn over them. */
export function SpritesTab() {
  const [sheet, setSheet] = useState<Pixels | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [corner, setCorner] = useState<Corner>('plate');
  const [suitY, setSuitY] = useState(16);
  const [rankEm, setRankEm] = useState(1);

  useEffect(() => {
    loadPixels(sheetUrl).then(setSheet, (e: unknown) => setError(e instanceof Error ? e.message : 'не удалось загрузить лист'));
  }, []);

  const arts = useMemo(() => (sheet ? buildArts(sheet) : null), [sheet]);

  if (error) return <p className="panel">Ошибка: {error}</p>;
  if (!arts) return <p className="panel">Загрузка листа…</p>;

  return (
    <div className="sprites">
      <section className="panel sprites__controls">
        <LabSelect label="Угол" value={corner} options={CORNERS} onChange={setCorner} />
        <label className="lab__slider">
          <span>Масть ниже ранга: {suitY}px</span>
          <input type="range" min={8} max={26} value={suitY} onChange={(e) => setSuitY(Number(e.target.value))} />
        </label>
        <label className="lab__slider">
          <span>Размер ранга: {rankEm}em</span>
          <input type="range" min={0.7} max={1.4} step={0.05} value={rankEm} onChange={(e) => setRankEm(Number(e.target.value))} />
        </label>
      </section>
      {FITS.map((fit) => {
        const set = arts[fit.id];
        return (
          <section key={fit.id} className="panel sprites__fit">
            <h2 className="gallery__title">{fit.name}</h2>
            <p className="gallery__subtitle">{fit.note}</p>
            <div className="sprites__row">
              <SpriteCard card={HERO} art={set.golden.art} url={set.golden.url} width={120} corner={corner} suitY={suitY} rankEm={rankEm} />
              <SpriteCard card={HAND[3] ?? HERO} art={set.trump.art} url={set.trump.url} foreignUrl={set.coin.url} width={120} corner={corner} suitY={suitY} rankEm={rankEm} />
            </div>
            <div className="sprites__row sprites__row--hand">
              <PixelCard card={HAND[5] ?? HERO} width={48} idle={false} />
              {ENHANCEMENT_IDS.map((id, i) => (
                <SpriteCard key={id} card={HAND[i] ?? HERO} art={set[id].art} url={set[id].url} width={48} corner={corner} suitY={suitY} rankEm={rankEm} />
              ))}
            </div>
            <p className="gallery__subtitle">Первая в ряду — обычная карта как сейчас (5:7), для сравнения высоты. Вверху справа — разделённая карта (Козырная / Монетная).</p>
          </section>
        );
      })}
    </div>
  );
}

import '@fontsource/jersey-10/400.css';
import '@fontsource/silkscreen/400.css';
import '@fontsource/silkscreen/700.css';
import { makeCard } from '@game/core';
import { useState, type CSSProperties } from 'react';
import { CardFace } from '../ui/CardFace';
import { CardSizeContext } from '../ui/CardSizeContext';
import type { CardSize } from '../ui/pixel/cardArt';

type Candidate = { readonly name: string; readonly family: string; readonly weight: number; readonly big: number; readonly small: number; readonly spacing: number };

/** Sizes are the font's own grid ×1 or ×2, so the pixels stay square. */
const CANDIDATES: readonly Candidate[] = [
  { name: 'm6x11 (сейчас)', family: 'm6x11', weight: 400, big: 22, small: 18, spacing: 0 },
  { name: 'Silkscreen Bold', family: 'Silkscreen', weight: 700, big: 16, small: 8, spacing: -1 },
  { name: 'Jersey 10', family: "'Jersey 10'", weight: 400, big: 20, small: 10, spacing: -1 },
  { name: 'Pixelify Sans Bold', family: "'Pixelify Sans'", weight: 700, big: 16, small: 12, spacing: -1 },
  { name: 'Tiny5', family: "'Tiny5'", weight: 400, big: 20, small: 10, spacing: -1 },
  { name: 'Press Start 2P', family: "'Press Start 2P'", weight: 400, big: 16, small: 8, spacing: -2 },
  { name: 'Handjet Bold', family: "'Handjet'", weight: 700, big: 24, small: 16, spacing: 0 },
];

const SAMPLES = [makeCard('hearts', 6), makeCard('spades', 10), makeCard('diamonds', 11), makeCard('clubs', 12), makeCard('hearts', 13), makeCard('spades', 14)];
const SIZE_W: Readonly<Record<CardSize, number>> = { l: 74, s: 52 };

function Cards({ size }: { readonly size: CardSize }) {
  return (
    <CardSizeContext.Provider value={size}>
      <div className="ranklab__cards">
        {SAMPLES.map((card) => (
          <div key={card.id} className="ranklab__card" style={{ width: SIZE_W[size], height: size === 'l' ? 104 : 73 }}>
            <CardFace card={card} />
          </div>
        ))}
      </div>
    </CardSizeContext.Provider>
  );
}

/** Rank font candidates on real cards, big (hand) and small (table), with sliders for size and letter spacing. */
export function RankFontTab() {
  const [overrides, setOverrides] = useState<Readonly<Record<string, Partial<Candidate>>>>({});
  const patch = (name: string, change: Partial<Candidate>): void => setOverrides((prev) => ({ ...prev, [name]: { ...prev[name], ...change } }));

  return (
    <div className="ranklab">
      {CANDIDATES.map((base) => {
        const c = { ...base, ...overrides[base.name] };
        const style = { '--rf': c.family, '--rw': c.weight, '--rl': `${c.big}px`, '--rs': `${c.small}px`, '--rsp': `${c.spacing}px` } as CSSProperties;
        return (
          <section key={base.name} className="ranklab__row" style={style}>
            <h3>{c.name} · {c.big}/{c.small}px</h3>
            <div className="ranklab__sliders">
              <label>большая <input type="range" min={8} max={32} value={c.big} onChange={(e) => patch(base.name, { big: Number(e.target.value) })} /></label>
              <label>малая <input type="range" min={6} max={22} value={c.small} onChange={(e) => patch(base.name, { small: Number(e.target.value) })} /></label>
              <label>зазор <input type="range" min={-4} max={2} value={c.spacing} onChange={(e) => patch(base.name, { spacing: Number(e.target.value) })} /></label>
            </div>
            <Cards size="l" />
            <Cards size="s" />
          </section>
        );
      })}
    </div>
  );
}

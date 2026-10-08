import { makeCard, SUIT_SYMBOLS, type Card } from '@game/core';
import { useState, type CSSProperties } from 'react';
import { PixelCard } from '../ui/PixelCard';
import { LabSelect } from './LabSelect';

const HAND: readonly Card[] = [
  makeCard('spades', 7),
  makeCard('clubs', 10),
  makeCard('diamonds', 14),
  makeCard('hearts', 9),
  makeCard('spades', 13),
  makeCard('hearts', 6),
];
const PLAYABLE = new Set([0, 2, 3]);
const TRUMP_INDEX = 4;

const MODES = [
  { id: 'frame', name: 'Рамка (сейчас)' },
  { id: 'glow', name: 'Мягкое свечение' },
  { id: 'pulse', name: 'Пульсирующее свечение' },
  { id: 'halo', name: 'Пиксельный ореол' },
] as const;
type Mode = (typeof MODES)[number]['id'];

const TRUMP_MARKS = [
  { id: 'dashed', name: 'Пунктир (сейчас)' },
  { id: 'gold', name: 'Золотое свечение' },
  { id: 'badge', name: 'Значок масти в углу' },
] as const;
type TrumpMark = (typeof TRUMP_MARKS)[number]['id'];

/** Playable cards (0, 2, 3) and a trump (4) in a hand, with switchable highlight styles. */
export function HighlightTab() {
  const [mode, setMode] = useState<Mode>('glow');
  const [trumpMark, setTrumpMark] = useState<TrumpMark>('gold');
  const [color, setColor] = useState('#ffffff');
  const [strength, setStrength] = useState(10);
  const [dimOthers, setDimOthers] = useState(true);
  const style = { '--hl-c': color, '--hl-s': `${strength}px` } as CSSProperties;

  return (
    <div className="hl" style={style}>
      <div className="lab__controls lab__controls--inline">
        <LabSelect label="Можно сходить" value={mode} options={MODES} onChange={setMode} />
        <LabSelect label="Козырь" value={trumpMark} options={TRUMP_MARKS} onChange={setTrumpMark} />
        <label className="lab__slider">
          <span>Цвет</span>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <label className="lab__slider">
          <span>Сила: {strength}</span>
          <input type="range" min={2} max={24} value={strength} onChange={(e) => setStrength(Number(e.target.value))} />
        </label>
        <label className="lab__check">
          <input type="checkbox" checked={dimOthers} onChange={(e) => setDimOthers(e.target.checked)} /> Затемнять остальные
        </label>
      </div>
      <div className="hl__hand">
        {HAND.map((card, i) => {
          const playable = PLAYABLE.has(i);
          const trump = i === TRUMP_INDEX;
          const classes = [
            'hl__slot',
            playable ? `hl--${mode} hl--lift` : dimOthers ? 'hl--dim' : '',
            trump ? `hl-trump--${trumpMark}` : '',
          ].join(' ');
          return (
            <div key={card.id} className={classes} style={{ rotate: `${(i - 2.5) * 5}deg` }}>
              <PixelCard card={card} width={52} swayDelay={i * 0.4} />
              {trump && trumpMark === 'badge' && <span className="hl__badge">{SUIT_SYMBOLS[card.suit]}</span>}
            </div>
          );
        })}
      </div>
      <p className="hl__note">Можно сходить: 7♠, Т♦, 9♥. Козырь: К♠.</p>
    </div>
  );
}

import { makeCard, SUIT_SYMBOLS, SUITS, type Suit } from '@game/core';
import { useState } from 'react';
import { PixelCard } from '../ui/PixelCard';
import { LabSelect } from './LabSelect';

const SUIT_OPTIONS = SUITS.map((suit) => ({ id: suit, name: SUIT_SYMBOLS[suit] }));
const W = 56;

function Stack() {
  const back = makeCard('spades', 6);
  return (
    <div className="tr__stack">
      {[0, 1, 2].map((i) => (
        <div key={i} className="tr__layer" style={{ transform: `translate(${-i * 2}px, ${-i * 2}px)` }}>
          <PixelCard card={back} width={W} faceDown idle={false} />
        </div>
      ))}
    </div>
  );
}

function SuitBadge({ suit, big = false }: { readonly suit: Suit; readonly big?: boolean }) {
  const red = suit === 'hearts' || suit === 'diamonds';
  return <span className={`tr__suit ${red ? 'tr__suit--red' : ''} ${big ? 'tr__suit--big' : ''}`}>{SUIT_SYMBOLS[suit]}</span>;
}

/** Three ways to show the trump next to the deck, on the real deck mock-up. */
export function TrumpTab() {
  const [suit, setSuit] = useState<Suit>('spades');
  const trump = makeCard(suit, 11);
  return (
    <div className="tr">
      <div className="lab__controls lab__controls--inline">
        <LabSelect label="Масть козыря" value={suit} options={SUIT_OPTIONS} onChange={setSuit} />
      </div>
      <div className="tr__variants">
        <section className="panel tr__variant">
          <h3>А · рядом открыто</h3>
          <div className="tr__deck tr__deck--a">
            <Stack />
            <div className="tr__open">
              <PixelCard card={trump} width={W} idle={false} />
            </div>
          </div>
          <span className="chip">Колода: 23</span>
        </section>
        <section className="panel tr__variant">
          <h3>Б · угол + плашка</h3>
          <div className="tr__deck tr__deck--b">
            <div className="tr__peek">
              <PixelCard card={trump} width={W} idle={false} />
            </div>
            <Stack />
          </div>
          <span className="chip tr__chip">
            Козырь <SuitBadge suit={suit} />
          </span>
        </section>
        <section className="panel tr__variant">
          <h3>В · знак над колодой</h3>
          <div className="tr__deck tr__deck--c">
            <div className="tr__peek">
              <PixelCard card={trump} width={W} idle={false} />
            </div>
            <Stack />
            <div className="tr__float">
              <SuitBadge suit={suit} big />
            </div>
          </div>
          <span className="chip">Колода: 23</span>
        </section>
      </div>
    </div>
  );
}

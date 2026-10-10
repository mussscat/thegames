import { makeCard } from '@game/core';
import { ENHANCEMENT_IDS, JOKER_IDS, JOKERS } from '@game/durak';
import { CardView } from '../components/CardView';
import { JokerFace } from '../games/durak/JokerFace';
import { PixelCard } from '../ui/PixelCard';
import '../games/durak/fight.css';

const SAMPLE = makeCard('hearts', 12);
/** Distinct cards: CardView animates by card id, so equal ids would merge into one. */
const HAND = [makeCard('spades', 10), makeCard('clubs', 9), makeCard('diamonds', 13), makeCard('spades', 14)] as const;

/** Everything collectible at a glance: all jokers (sprite or emblem fallback, with a badge sample) and all card enhancements. */
export function GalleryTab() {
  return (
    <div className="gallery">
      <section className="panel gallery__section">
        <h2 className="gallery__title">Усиления карт</h2>
        <div className="gallery__cards">
          <PixelCard card={SAMPLE} width={72} idle={false} showLabel />
          {ENHANCEMENT_IDS.map((id) => (
            <PixelCard key={id} card={SAMPLE} width={72} enhancement={id} idle={false} showLabel />
          ))}
        </div>
        <h3 className="gallery__subtitle">В руке: твоё, соперника и обе (диагональ)</h3>
        <div className="gallery__cards gallery__cards--hand">
          <CardView card={HAND[0]} enhancements={{ own: 'golden' }} />
          <CardView card={HAND[1]} enhancements={{ foreign: 'sharp' }} />
          <CardView card={HAND[2]} enhancements={{ own: 'heavy', foreign: 'coin' }} onTapOption={() => undefined} />
          <CardView card={HAND[3]} enhancements={{ own: 'trump', foreign: 'golden' }} onTapOption={() => undefined} legalUses={['own']} />
        </div>
      </section>
      <section className="panel gallery__section">
        <h2 className="gallery__title">Джокеры</h2>
        <ul className="gallery__jokers">
          {JOKER_IDS.map((id, i) => (
            <li key={id} className="gallery__joker">
              <JokerFace id={id} badge={i === 9 ? 'заряд +8' : null} />
              <span>
                {JOKERS[id].name} · ● {JOKERS[id].price}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

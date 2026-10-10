import { JOKER_IDS, JOKERS, RARITIES, type Rarity } from '@game/durak';
import { JokerFace } from '../games/durak/JokerFace';
import { jokerArtUrl } from '../ui/pixel/cardArt';

const RARITY_NAMES: Readonly<Record<Rarity, string>> = { common: 'Обычные', rare: 'Редкие', legendary: 'Легендарные' };

/** The whole joker collection as cards, grouped by rarity, with price, rule and whether the sprite is drawn yet. */
export function JokersTab() {
  const drawn = JOKER_IDS.filter((id) => jokerArtUrl(id)).length;
  return (
    <div className="jokerlab">
      <p className="panel jokerlab__summary">
        Спрайты: {drawn} из {JOKER_IDS.length}. Без спрайта — эмблема на обычной карте.
      </p>
      {RARITIES.map((rarity) => (
        <section key={rarity} className="panel jokerlab__group">
          <h2 className="gallery__title">{RARITY_NAMES[rarity]}</h2>
          <ul className="jokerlab__grid">
            {JOKER_IDS.filter((id) => JOKERS[id].rarity === rarity).map((id) => (
              <li key={id} className="jokerlab__item">
                <JokerFace id={id} />
                <strong className="jokerlab__name">{JOKERS[id].name}</strong>
                <span className="jokerlab__meta">
                  ● {JOKERS[id].price} · {jokerArtUrl(id) ? 'спрайт' : 'эмблема'}
                </span>
                <span className="jokerlab__text">{JOKERS[id].description}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

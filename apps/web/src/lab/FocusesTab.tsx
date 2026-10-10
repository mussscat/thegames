import { FOCUS_IDS, FOCUSES, RARITIES, type Rarity } from '@game/durak';
import { PackCardFace } from '../games/durak/shop/PackCardFace';
import { Coin } from '../ui/Coin';
import { focusArtUrl } from '../ui/pixel/cardArt';

const RARITY_NAMES: Readonly<Record<Rarity, string>> = { common: 'Обычные', rare: 'Редкие', legendary: 'Легендарные' };

/** The whole focus collection as cards, grouped by rarity, with price, rule and whether the picture is drawn yet. */
export function FocusesTab() {
  const drawn = FOCUS_IDS.filter((id) => focusArtUrl(id)).length;
  return (
    <div className="jokerlab">
      <p className="panel jokerlab__summary">
        Картинки: {drawn} из {FOCUS_IDS.length}. Без картинки — значок на синей карте.
      </p>
      {RARITIES.map((rarity) => (
        <section key={rarity} className="panel jokerlab__group">
          <h2 className="gallery__title">{RARITY_NAMES[rarity]}</h2>
          <ul className="jokerlab__grid jokerlab__grid--tarot">
            {FOCUS_IDS.filter((id) => FOCUSES[id].rarity === rarity).map((id) => (
              <li key={id} className="jokerlab__item">
                <PackCardFace card={{ kind: 'focus', focusId: id }} size="big" />
                <strong className="jokerlab__name">{FOCUSES[id].name}</strong>
                <span className="jokerlab__meta">
                  <Coin /> {FOCUSES[id].price} · {focusArtUrl(id) ? 'картинка' : 'значок'}
                </span>
                <span className="jokerlab__text">{FOCUSES[id].description}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

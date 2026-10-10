import { RARITIES, TAROT_IDS, TAROTS, type Rarity } from '@game/durak';
import { PackCardFace } from '../games/durak/shop/PackCardFace';
import { tarotArtUrl } from '../ui/pixel/cardArt';

const RARITY_NAMES: Readonly<Record<Rarity, string>> = { common: 'Обычные', rare: 'Редкие', legendary: 'Легендарные' };

/** The whole tarot collection as cards, grouped by rarity, with the rule and whether the picture is drawn yet. */
export function TarotsTab() {
  const drawn = TAROT_IDS.filter((id) => tarotArtUrl(id)).length;
  return (
    <div className="jokerlab">
      <p className="panel jokerlab__summary">
        Картинки: {drawn} из {TAROT_IDS.length}. Без картинки — значок на тёмной карте.
      </p>
      {RARITIES.map((rarity) => (
        <section key={rarity} className="panel jokerlab__group">
          <h2 className="gallery__title">{RARITY_NAMES[rarity]}</h2>
          <ul className="jokerlab__grid jokerlab__grid--tarot">
            {TAROT_IDS.filter((id) => TAROTS[id].rarity === rarity).map((id) => (
              <li key={id} className="jokerlab__item">
                <PackCardFace card={{ kind: 'tarot', tarotId: id }} size="big" />
                <strong className="jokerlab__name">{TAROTS[id].name}</strong>
                <span className="jokerlab__meta">
                  {TAROTS[id].numeral} · {tarotArtUrl(id) ? 'картинка' : 'значок'}
                </span>
                <span className="jokerlab__text">{TAROTS[id].description}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

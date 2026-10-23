import { PACK_KINDS, PACK_SIZES, PACK_SIZE_DEFS } from '@game/durak';
import { useEffect, useState } from 'react';
import { PackArt } from '../games/durak/shop/PackArt';
import { PACK_NAMES, PACK_SIZE_NAMES } from '../games/durak/shop/shopCopy';
import { Coin } from '../ui/Coin';
import { Icon } from '../ui/Icon';
import { ICON_IDS } from '../ui/pixel/sheet';
import { coinSpinUrls, iconUrl, type CoinKind } from '../ui/pixel/uiArt';

const COIN_KINDS: readonly { readonly kind: CoinKind; readonly name: string }[] = [
  { kind: 'face', name: 'Обычная' },
  { kind: 'red', name: 'Не хватает' },
  { kind: 'grey', name: 'Отключена' },
  { kind: 'plate', name: 'На подложке' },
];
const SPIN_MS = 110;

function SpinningCoin() {
  const frames = coinSpinUrls();
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (frames.length === 0) return undefined;
    const timer = window.setInterval(() => setFrame((f) => (f + 1) % frames.length), SPIN_MS);
    return () => window.clearInterval(timer);
  }, [frames.length]);
  const url = frames[frame];
  return url ? <img className="uilab__spin" src={url} alt="" draggable={false} /> : <span>нет кадров</span>;
}

/** Packs (4 kinds × 3 sizes), the coin (spin, states, in text) and all 23 interface icons at a glance. */
export function UiTab() {
  const drawnIcons = ICON_IDS.filter((id) => iconUrl(id)).length;
  return (
    <div className="jokerlab">
      <section className="panel jokerlab__group">
        <h2 className="gallery__title">Паки</h2>
        <p className="jokerlab__summary">Фольга своего вида с эмблемой; размер написан на плашке.</p>
        {PACK_SIZES.map((size) => (
          <div key={size} className="uilab__row">
            <h3 className="gallery__subtitle">
              {PACK_SIZE_NAMES[size]} · {PACK_SIZE_DEFS[size].cards} карт, взять {PACK_SIZE_DEFS[size].picks}
            </h3>
            <ul className="uilab__packs">
              {PACK_KINDS.map((kind) => (
                <li key={kind} className="uilab__pack" title={PACK_NAMES[kind]}>
                  <PackArt kind={kind} size={size} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <section className="panel jokerlab__group">
        <h2 className="gallery__title">Монета</h2>
        <div className="uilab__coins">
          <figure className="uilab__figure">
            <SpinningCoin />
            <figcaption>Вращение</figcaption>
          </figure>
          {COIN_KINDS.map(({ kind, name }) => (
            <figure key={kind} className="uilab__figure">
              <span className="uilab__big">
                <Coin kind={kind} />
              </span>
              <figcaption>{name}</figcaption>
            </figure>
          ))}
        </div>
        <p className="uilab__text">
          В тексте: <Coin /> 12 монет · <span className="uilab__small">мелко <Coin /> 4</span> · <span className="uilab__large">крупно <Coin /> 30</span>
        </p>
      </section>
      <section className="panel jokerlab__group">
        <h2 className="gallery__title">Значки</h2>
        <p className="jokerlab__summary">
          Нарезано {drawnIcons} из {ICON_IDS.length}. Крупно и в размере текста.
        </p>
        <ul className="uilab__icons">
          {ICON_IDS.map((id) => (
            <li key={id} className="uilab__icon">
              <span className="uilab__big">
                <Icon id={id} fallback="?" />
              </span>
              <span className="uilab__inline">
                <Icon id={id} fallback="?" /> текст
              </span>
              <code>{id}</code>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

import { stageEnemy, stageLabel, type FightReward, type RunAction, type RunState, type ShopState } from '@game/durak';
import { useEffect, useState } from 'react';
import { PixelButton } from '../../ui/PixelButton';
import { useSettings } from '../../ui/SettingsContext';
import { usePrevious } from '../../ui/usePrevious';
import { OwnedJokers } from './shop/OwnedJokers';
import { PackArt } from './shop/PackArt';
import { PackCardFace } from './shop/PackCardFace';
import { ShopDetail, type ShopFocus } from './shop/ShopDetail';
import { ShopSlot } from './shop/ShopSlot';
import { PACK_NAMES, PACK_SIZE_NAMES, packCardTitle } from './shop/shopCopy';
import { coinSound, isNewError } from './sounds';
import './fight.css';
import './shop.css';

type ShopScreenProps = {
  readonly run: RunState;
  readonly shop: ShopState;
  readonly reward: FightReward;
  readonly error: string | null;
  readonly errorSeq: number;
  readonly onAct: (action: RunAction) => void;
  readonly onExit: () => void;
};

/** Balatro's shop: owned jokers on top, a «МАГАЗИН» panel with 2 items and 2 packs, reroll and next fight. */
export function ShopScreen({ run, shop, reward, error, errorSeq, onAct, onExit }: ShopScreenProps) {
  const { play } = useSettings();
  const [focus, setFocus] = useState<ShopFocus | null>(null);
  const previousCoins = usePrevious(run.coins);
  useEffect(() => {
    if (previousCoins === undefined) return;
    const sound = coinSound(previousCoins, run.coins);
    if (sound) play(sound);
  }, [run.coins, previousCoins, play]);
  const previousErrorSeq = usePrevious(errorSeq);
  useEffect(() => {
    if (isNewError(previousErrorSeq, errorSeq)) play('deny');
  }, [errorSeq, previousErrorSeq, play]);
  const next = stageEnemy(run, run.stage + 1);
  const { circle, fight } = stageLabel(run.stage + 1);

  return (
    <main className="screen shop" data-testid="shop">
      <header className="shop__side panel">
        <PixelButton tone="blue" small onClick={onExit}>
          Меню
        </PixelButton>
        <span className="shop__coins" aria-label={`Монеты: ${run.coins}`}>
          ● {run.coins}
        </span>
        <span className="shop__stage">
          Круг {circle} · бой {fight}
        </span>
        <span className="shop__reward" data-testid="shop-reward">
          Награда +{reward.total}
        </span>
      </header>

      <OwnedJokers jokers={run.jokers} onAct={onAct} />

      <section className="shop__panel panel" aria-label="Магазин">
        <h2 className="shop__head">Магазин</h2>
        <nav className="shop__bar">
          <PixelButton tone="red" onClick={() => onAct({ type: 'leaveShop' })}>
            Следующий бой: {next.name}
          </PixelButton>
          <PixelButton tone="green" onClick={() => onAct({ type: 'reroll' })}>
            Рерол ● {shop.rerollCost}
          </PixelButton>
        </nav>
        <div className="shop__items">
          {shop.items.map((item, index) => (
            <ShopSlot
              key={`item-${index}`}
              testId={`shop-item-${index}`}
              price={item?.price ?? null}
              label={item ? `${packCardTitle(item.card)}, ${item.price} монет` : 'Продано'}
              onOpen={() => setFocus({ kind: 'item', index })}
            >
              {item && <PackCardFace card={item.card} />}
            </ShopSlot>
          ))}
        </div>
        <div className="shop__packs">
          {shop.packs.map((pack, index) => (
            <ShopSlot
              key={`pack-${index}`}
              testId={`shop-pack-${index}`}
              price={pack?.price ?? null}
              label={pack ? `${PACK_NAMES[pack.kind]}, ${PACK_SIZE_NAMES[pack.size]}, ${pack.price} монет` : 'Продано'}
              onOpen={() => setFocus({ kind: 'pack', index })}
            >
              {pack && <PackArt kind={pack.kind} size={pack.size} />}
            </ShopSlot>
          ))}
        </div>
      </section>

      <p className={error ? 'shop__status panel' : 'shop__status'} role="status">
        {error ?? ''}
      </p>

      {focus && <ShopDetail focus={focus} shop={shop} run={run} onAct={onAct} onClose={() => setFocus(null)} />}
    </main>
  );
}

import { JOKERS, stageEnemy, stageLabel, type FightReward, type PackCard, type RunAction, type RunState, type ShopState } from '@game/durak';
import { useEffect, useRef, useState } from 'react';
import { PixelButton } from '../../ui/PixelButton';
import { useSettings } from '../../ui/SettingsContext';
import { usePrevious } from '../../ui/usePrevious';
import { OwnedJokers } from './shop/OwnedJokers';
import { PackArt } from './shop/PackArt';
import { PackCardFace } from './shop/PackCardFace';
import { PackOpening } from './shop/PackOpening';
import { ShopDetail, type ShopFocus } from './shop/ShopDetail';
import { ShopSlot } from './shop/ShopSlot';
import { PACK_NAMES, PACK_SIZE_NAMES, packCardTitle } from './shop/shopCopy';
import { TarotCastSheet } from './shop/TarotCastSheet';
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
  const { settings, play } = useSettings();
  const [focus, setFocus] = useState<ShopFocus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /**
   * Set when Колесо Фортуны is used — from a pack or straight off the shelf: the jokers count and the shop state it changes
   * (`opened` or `items`), to tell the result once the action lands.
   */
  const wheel = useRef<{ readonly jokers: number; readonly marker: unknown } | null>(null);
  const [openingKey, setOpeningKey] = useState(0);
  const previousOpened = usePrevious(shop.opened);
  useEffect(() => {
    if (shop.opened && !previousOpened) setOpeningKey((key) => key + 1);
  }, [shop.opened, previousOpened]);
  useEffect(() => {
    const pending = wheel.current;
    if (!pending || (pending.marker === shop.opened || pending.marker === shop.items)) return;
    wheel.current = null;
    const gained = run.jokers.length > pending.jokers ? run.jokers.at(-1) : undefined;
    setNotice(gained ? `Колесо Фортуны: ${JOKERS[gained].name}!` : 'Колесо Фортуны: не повезло');
  }, [shop.opened, shop.items, run.jokers]);

  const isWheel = (card: PackCard | null | undefined): boolean => card?.kind === 'tarot' && card.tarotId === 'wheel';
  const pick = (index: number, targets: readonly string[]): void => {
    if (isWheel(shop.opened?.cards[index])) wheel.current = { jokers: run.jokers.length, marker: shop.opened };
    setNotice(null);
    onAct({ type: 'pickFromPack', index, targets });
  };
  /** The detail sheet's actions; a shelf Колесо Фортуны is cast on purchase, so its result is told here too. */
  const actFromSheet = (action: RunAction): void => {
    if (action.type === 'buyItem' && isWheel(shop.items[action.index]?.card)) wheel.current = { jokers: run.jokers.length, marker: shop.items };
    setNotice(null);
    onAct(action);
  };
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
        {error ?? notice ?? ''}
      </p>

      {focus && <ShopDetail focus={focus} shop={shop} run={run} onAct={actFromSheet} onClose={() => setFocus(null)} />}
      {shop.casting && (
        <TarotCastSheet
          key={`${shop.casting.tarotId}-${shop.casting.hand.join()}`}
          cast={shop.casting}
          profile={run.profile}
          error={error}
          onCast={(targets) => onAct({ type: 'castTarot', targets })}
          onSkip={() => onAct({ type: 'skipTarot' })}
        />
      )}
      {shop.opened && (
        <PackOpening
          key={openingKey}
          opened={shop.opened}
          profile={run.profile}
          jokers={run.jokers}
          speed={settings.animSpeed}
          error={error}
          onPick={pick}
          onSkip={() => onAct({ type: 'skipPack' })}
          onSell={(jokerId) => onAct({ type: 'sellJoker', jokerId })}
        />
      )}
    </main>
  );
}

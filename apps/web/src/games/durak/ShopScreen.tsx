import {
  conflictFor,
  ENHANCEMENTS,
  JOKERS,
  stageEnemy,
  stageLabel,
  type FightReward,
  type JokerId,
  type PackCard,
  type RunAction,
  type RunState,
  type ShopItem,
  type ShopState,
} from '@game/durak';
import { useEffect, useRef, useState } from 'react';
import { PixelButton } from '../../ui/PixelButton';
import { useSettings } from '../../ui/SettingsContext';
import { usePrevious } from '../../ui/usePrevious';
import { OwnedJokers } from './shop/OwnedJokers';
import { PackArt } from './shop/PackArt';
import { PackCardFace } from './shop/PackCardFace';
import { PackOpening } from './shop/PackOpening';
import { ShopSlot } from './shop/ShopSlot';
import { cardTipLines, PACK_NAMES, packCardTitle, packTipLines } from './shop/shopCopy';
import { TarotCastSheet } from './shop/TarotCastSheet';
import { castsWheelNow } from './shop/opening';
import { coinSound, isNewError } from './sounds';
import './fight.css';
import './shop.css';

type Selection = { readonly kind: 'item' | 'pack'; readonly index: number };

/** «В колоде: Острая → станет Золотая» for a shelf card that would replace another enhancement. */
function replacementWarning(item: ShopItem | null, profile: RunState['profile']): string | null {
  if (item?.card.kind !== 'card') return null;
  const replaced = conflictFor(profile, item.card.cardId, item.card.enhancement);
  return replaced ? `В колоде: ${ENHANCEMENTS[replaced].name} → станет ${ENHANCEMENTS[item.card.enhancement].name}` : null;
}

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
  const [selected, setSelected] = useState<Selection | null>(null);
  const [selectedJoker, setSelectedJoker] = useState<JokerId | null>(null);
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
  /** Buys the selected slot; a shelf Колесо Фортуны is cast on purchase, so its result is told here too. */
  const buy = (action: RunAction): void => {
    const busy = shop.opened !== null || shop.casting !== null;
    if (action.type === 'buyItem' && castsWheelNow(shop.items[action.index], run.coins, busy)) wheel.current = { jokers: run.jokers.length, marker: shop.items };
    setNotice(null);
    setSelected(null);
    onAct(action);
  };
  const select = (next: Selection): void => {
    setSelectedJoker(null);
    setSelected(selected?.kind === next.kind && selected.index === next.index ? null : next);
  };
  const clearSelection = (): void => {
    setSelected(null);
    setSelectedJoker(null);
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
    <main className="screen shop" data-testid="shop" onClick={clearSelection}>
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

      <OwnedJokers
        jokers={run.jokers}
        selected={selectedJoker}
        onSelect={(id) => {
          setSelected(null);
          setSelectedJoker(id);
        }}
        onAct={onAct}
      />

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
              coins={run.coins}
              title={item ? packCardTitle(item.card) : ''}
              tip={item ? cardTipLines(item.card, run.profile) : []}
              selected={selected?.kind === 'item' && selected.index === index}
              verb="Купить"
              warning={replacementWarning(item, run.profile)}
              onSelect={() => select({ kind: 'item', index })}
              onBuy={() => buy({ type: 'buyItem', index })}
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
              coins={run.coins}
              title={pack ? PACK_NAMES[pack.kind] : ''}
              tip={pack ? packTipLines(pack) : []}
              selected={selected?.kind === 'pack' && selected.index === index}
              verb="Купить"
              onSelect={() => select({ kind: 'pack', index })}
              onBuy={() => buy({ type: 'buyPack', index })}
            >
              {pack && <PackArt kind={pack.kind} size={pack.size} />}
            </ShopSlot>
          ))}
        </div>
      </section>

      <p className={error ? 'shop__status panel' : 'shop__status'} role="status">
        {error ?? notice ?? ''}
      </p>

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

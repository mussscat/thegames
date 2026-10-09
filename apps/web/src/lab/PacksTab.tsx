import { createRng } from '@game/core';
import {
  ENHANCEMENTS,
  JOKERS,
  PACK_KINDS,
  PACK_SIZE_DEFS,
  PACK_SIZES,
  pickFromPack,
  rollPackCards,
  rollTarotHand,
  TAROT_IDS,
  type PackKind,
  type PackSize,
  type Purse,
  type ShopState,
} from '@game/durak';
import { useState } from 'react';
import { PackCardFace } from '../games/durak/shop/PackCardFace';
import { PackOpening } from '../games/durak/shop/PackOpening';
import { cardLabel, PACK_NAMES, PACK_SIZE_NAMES } from '../games/durak/shop/shopCopy';
import '../games/durak/shop.css';
import { PixelButton } from '../ui/PixelButton';
import { SettingsProvider, useSettings } from '../ui/SettingsContext';

type Bench = { readonly shop: ShopState; readonly purse: Purse };

const EMPTY_SHOP: ShopState = { items: [], packs: [], rerollCost: 0, opened: null, casting: null };

function PacksBench() {
  const { settings } = useSettings();
  const [kind, setKind] = useState<PackKind>('jokers');
  const [size, setSize] = useState<PackSize>('normal');
  const [seed, setSeed] = useState(1);
  const [bench, setBench] = useState<Bench>({ shop: EMPTY_SHOP, purse: { coins: 10, jokers: [], profile: {}, rng: createRng(1) } });

  const open = (): void => {
    const [cards, afterCards] = rollPackCards(createRng(seed), { kind, size, price: 0 }, bench.purse.jokers, bench.purse.profile);
    const [hand, rng] = rollTarotHand(afterCards);
    const opened = { kind, cards, picksLeft: PACK_SIZE_DEFS[size].picks, hand: kind === 'arcana' ? hand : [] };
    setBench({ shop: { ...EMPTY_SHOP, opened }, purse: { ...bench.purse, rng } });
    setSeed((value) => value + 1);
  };
  const pick = (index: number, targets: readonly string[]): void => {
    const result = pickFromPack(bench.shop, bench.purse, index, targets);
    if (result.ok) setBench(result.value);
  };
  const deck = Object.entries(bench.purse.profile)
    .map(([cardId, id]) => (id ? `${cardLabel(cardId)} ${ENHANCEMENTS[id].name}` : ''))
    .join(', ');

  return (
    <div className="lab__packs" data-testid="lab-packs">
      <div className="lab__row">
        <label>
          Тип{' '}
          <select value={kind} onChange={(event) => setKind(event.target.value as PackKind)}>
            {PACK_KINDS.map((id) => (
              <option key={id} value={id}>
                {PACK_NAMES[id]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Размер{' '}
          <select value={size} onChange={(event) => setSize(event.target.value as PackSize)}>
            {PACK_SIZES.map((id) => (
              <option key={id} value={id}>
                {PACK_SIZE_NAMES[id]}
              </option>
            ))}
          </select>
        </label>
        <PixelButton tone="orange" onClick={open}>
          Вскрыть
        </PixelButton>
      </div>
      <p>
        Монеты: {bench.purse.coins} · Джокеры: {bench.purse.jokers.map((id) => JOKERS[id].name).join(', ') || '—'} · Колода: {deck || '—'}
      </p>
      <h3>Все таро</h3>
      <div className="lab__tarots">
        {TAROT_IDS.map((id) => (
          <PackCardFace key={id} card={{ kind: 'tarot', tarotId: id }} size="big" />
        ))}
      </div>
      {bench.shop.opened && (
        <PackOpening
          key={seed}
          opened={bench.shop.opened}
          profile={bench.purse.profile}
          jokers={bench.purse.jokers}
          speed={settings.animSpeed}
          onPick={pick}
          onSkip={() => setBench({ ...bench, shop: EMPTY_SHOP })}
          onSell={() => undefined}
        />
      )}
    </div>
  );
}

/** Open any pack type and size without a run; the picks land in a scratch purse shown below. */
export function PacksTab() {
  return (
    <SettingsProvider>
      <PacksBench />
    </SettingsProvider>
  );
}

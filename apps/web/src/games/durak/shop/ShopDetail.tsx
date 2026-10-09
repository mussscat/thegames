import { conflictFor, ENHANCEMENTS, packCardRarity, type RunAction, type RunState, type ShopState } from '@game/durak';
import { PixelButton } from '../../../ui/PixelButton';
import { DetailSheet } from './DetailSheet';
import { PackArt } from './PackArt';
import { PackCardFace } from './PackCardFace';
import { PACK_NAMES, PACK_SIZE_NAMES, PACK_TEXT, packCardText, packCardTitle, packSizeText, RARITY_NAMES } from './shopCopy';

export type ShopFocus = { readonly kind: 'item' | 'pack'; readonly index: number };

type ShopDetailProps = {
  readonly focus: ShopFocus;
  readonly shop: ShopState;
  readonly run: RunState;
  readonly onAct: (action: RunAction) => void;
  readonly onClose: () => void;
};

/** The sheet for a tapped item or pack, with its buy button and the replacement warning. */
export function ShopDetail({ focus, shop, run, onAct, onClose }: ShopDetailProps) {
  const buy = (action: RunAction): void => {
    onAct(action);
    onClose();
  };
  if (focus.kind === 'pack') {
    const pack = shop.packs[focus.index];
    if (!pack) return null;
    const name = PACK_NAMES[pack.kind];
    return (
      <DetailSheet
        title={name}
        subtitle={`${PACK_SIZE_NAMES[pack.size]} · ${packSizeText(pack.size)}`}
        text={PACK_TEXT[pack.kind]}
        art={<PackArt kind={pack.kind} size={pack.size} />}
        onClose={onClose}
        actions={
          <PixelButton tone="orange" aria-label={`Купить ${name} за ${pack.price}`} onClick={() => buy({ type: 'buyPack', index: focus.index })}>
            Открыть за ● {pack.price}
          </PixelButton>
        }
      />
    );
  }
  const item = shop.items[focus.index];
  if (!item) return null;
  const { card } = item;
  const title = packCardTitle(card);
  const replaced = card.kind === 'card' ? conflictFor(run.profile, card.cardId, card.enhancement) : null;
  const warning = replaced && card.kind === 'card' ? `В колоде: ${ENHANCEMENTS[replaced].name} → станет ${ENHANCEMENTS[card.enhancement].name}` : null;
  return (
    <DetailSheet
      title={title}
      subtitle={`Редкость: ${RARITY_NAMES[packCardRarity(card)]}`}
      text={packCardText(card)}
      warning={warning}
      art={<PackCardFace card={card} size="big" />}
      onClose={onClose}
      actions={
        <PixelButton tone="orange" aria-label={`Купить ${title} за ${item.price}`} onClick={() => buy({ type: 'buyItem', index: focus.index })}>
          Купить за ● {item.price}
        </PixelButton>
      }
    />
  );
}

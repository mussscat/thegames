import { useRef, type MouseEvent, type ReactNode } from 'react';
import { CardTip, useCardTip } from '../../../components/CardTip';
import type { TipLine } from '../../../components/tipLines';
import { PixelIcon } from '../../../components/pixel/PixelIcon';
import { PixelText } from '../../../components/pixel/PixelText';
import { FeelBox } from '../../../ui/FeelBox';
import { PixelButton } from '../../../ui/PixelButton';
import { DetailSheet } from './DetailSheet';

/** What the tapped slot's sheet shows: the big art, the rarity or size line and the rule. */
export type SlotSheet = { readonly subtitle?: string; readonly text: string; readonly art: ReactNode };

type ShopSlotProps = {
  /** null — sold this visit. */
  readonly price: number | null;
  readonly coins: number;
  readonly title: string;
  readonly testId: string;
  readonly tip: readonly TipLine[];
  /** null — sold this visit. */
  readonly sheet: SlotSheet | null;
  readonly selected: boolean;
  /** «Купить» for single items, «Открыть» for packs. */
  readonly verb: string;
  readonly warning?: string | null;
  /** The purchase happens once the sheet has closed — for a pack, whose opening is a full-screen layer. */
  readonly buyAfterClose?: boolean;
  /** Disables the buy button with this text (e.g. «Мало места»). */
  readonly blocked?: string | null;
  readonly onSelect: () => void;
  readonly onBuy: () => void;
  readonly children: ReactNode;
};

/**
 * A Balatro shop slot: a coin tag on the card's top edge (red when unaffordable), the description on hover or long press,
 * a tap opens a sheet with the big art, the rule and the buy button — disabled when the coins are short.
 * The sheet outlives the sale: it plays its exit animation over the remembered content of the sold slot.
 */
export function ShopSlot({ price, coins, title, testId, tip, sheet, selected, verb, warning = null, buyAfterClose = false, blocked = null, onSelect, onBuy, children }: ShopSlotProps) {
  const { anchor, handlers } = useCardTip(price !== null, false);
  const lastSheet = useRef<{ readonly title: string; readonly price: number; readonly sheet: SlotSheet } | null>(null);
  if (price !== null && sheet) lastSheet.current = { title, price, sheet };
  const shown = lastSheet.current;
  const sheetView = selected && shown && (
    <DetailSheet
      title={shown.title}
      subtitle={shown.sheet.subtitle}
      text={shown.sheet.text}
      warning={price === null ? null : warning}
      art={shown.sheet.art}
      onClose={onSelect}
      actions={(close) => (
        <PixelButton
          tone="orange"
          disabled={price === null || coins < shown.price || blocked !== null}
          aria-label={`${verb} ${shown.title} за ${shown.price}`}
          onClick={() => {
            if (buyAfterClose) {
              close(onBuy);
              return;
            }
            onBuy();
            close();
          }}
        >
          {blocked ?? (coins >= shown.price ? `${verb} за ${shown.price}` : 'Мало монет')}
        </PixelButton>
      )}
    />
  );
  const stop = (event: MouseEvent): void => event.stopPropagation();
  const affordable = price !== null && coins >= price;
  // One stable tree for a live and a sold slot: the sheet must not remount when the purchase lands, or it opens again.
  return (
    <div className={price === null ? 'shop-slot shop-slot--sold' : 'shop-slot'} data-testid={testId} onClick={stop}>
      {price === null ? (
        <span className="shop-slot__sold">Продано</span>
      ) : (
        <>
          <span className={affordable ? 'price-tag' : 'price-tag price-tag--short'} aria-hidden="true">
            <PixelIcon name="coin" />
            <PixelText>{price}</PixelText>
          </span>
          <button type="button" className="shop-slot__face" aria-label={`${title}, ${price} монет`} aria-pressed={selected} onClick={onSelect} {...handlers}>
            <FeelBox>{children}</FeelBox>
          </button>
          {anchor && <CardTip anchor={anchor} lines={tip} />}
        </>
      )}
      {sheetView}
    </div>
  );
}

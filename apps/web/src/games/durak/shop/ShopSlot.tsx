import type { MouseEvent, ReactNode } from 'react';
import { CardTip, useCardTip } from '../../../components/CardTip';
import type { TipLine } from '../../../components/tipLines';
import { PixelButton } from '../../../ui/PixelButton';

type ShopSlotProps = {
  /** null — sold this visit. */
  readonly price: number | null;
  readonly coins: number;
  readonly title: string;
  readonly testId: string;
  readonly tip: readonly TipLine[];
  readonly selected: boolean;
  /** «Купить» for single items, «Открыть» for packs. */
  readonly verb: string;
  readonly warning?: string | null;
  readonly onSelect: () => void;
  readonly onBuy: () => void;
  readonly children: ReactNode;
};

/**
 * A Balatro shop slot: a coin tag on the card's top edge (red when unaffordable), the description on hover or long press,
 * a tap selects it and shows the buy button under it — disabled when the coins are short.
 */
export function ShopSlot({ price, coins, title, testId, tip, selected, verb, warning = null, onSelect, onBuy, children }: ShopSlotProps) {
  const { anchor, handlers } = useCardTip(price !== null, false);
  if (price === null) {
    return (
      <div className="shop-slot shop-slot--sold" data-testid={testId}>
        <span className="shop-slot__sold">Продано</span>
      </div>
    );
  }
  const affordable = coins >= price;
  const stop = (event: MouseEvent): void => event.stopPropagation();
  return (
    <div className={selected ? 'shop-slot shop-slot--selected' : 'shop-slot'} data-testid={testId} onClick={stop}>
      <span className={affordable ? 'price-tag' : 'price-tag price-tag--short'} aria-hidden="true">
        <span className="price-tag__coin" />
        {price}
      </span>
      <button
        type="button"
        className="shop-slot__face"
        aria-label={`${title}, ${price} монет`}
        aria-pressed={selected}
        onClick={onSelect}
        {...handlers}
      >
        {children}
      </button>
      {selected && (
        <div className="shop-slot__buy">
          {warning && <p className="shop-slot__warning">{warning}</p>}
          <PixelButton tone="orange" small disabled={!affordable} aria-label={`${verb} ${title} за ${price}`} onClick={onBuy}>
            {affordable ? verb : 'Мало монет'}
          </PixelButton>
        </div>
      )}
      {anchor && <CardTip anchor={anchor} lines={tip} />}
    </div>
  );
}

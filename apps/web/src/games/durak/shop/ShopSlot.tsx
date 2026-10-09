import type { ReactNode } from 'react';

type ShopSlotProps = {
  readonly price: number | null;
  readonly label: string;
  readonly testId: string;
  readonly onOpen: () => void;
  readonly children: ReactNode;
};

/** A shop slot with a hanging price tag; `price: null` — sold this visit. */
export function ShopSlot({ price, label, testId, onOpen, children }: ShopSlotProps) {
  if (price === null) {
    return (
      <div className="shop-slot shop-slot--sold" data-testid={testId}>
        Продано
      </div>
    );
  }
  return (
    <div className="shop-slot" data-testid={testId}>
      <span className="price-tag">● {price}</span>
      <button type="button" className="shop-slot__face" aria-label={label} onClick={onOpen}>
        {children}
      </button>
    </div>
  );
}

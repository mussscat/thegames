import type { ReactNode } from 'react';
import { useTableSlot } from '../../ui/useFlightIn';

type TableSlotProps = {
  readonly cardId: string;
  readonly className: string;
  /** Fly in from the hand; off where the old shared-layout morph does the job. */
  readonly fly: boolean;
  /** Where to slide in from when the hand it left is unknown. */
  readonly fallbackY: number;
  /** Leaves a copy that is swept away when the place goes (a pair: the defense is inside the copy). */
  readonly leaves?: boolean;
  readonly children: ReactNode;
  readonly [attr: `data-${string}`]: string | undefined;
};

/** A place on the table that its card flies into. */
export function TableSlot({ cardId, className, fly, fallbackY, leaves = false, children, ...data }: TableSlotProps) {
  const ref = useTableSlot<HTMLDivElement>(cardId, fly, fallbackY, leaves);
  return (
    <div ref={ref} className={className} {...data}>
      {children}
    </div>
  );
}

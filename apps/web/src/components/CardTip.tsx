import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { TipLine } from './tipLines';

const HOVER_MS = 200;
const LONG_PRESS_MS = 450;
const TAP_TIP_MS = 2500;
const MOVE_TOLERANCE_PX = 10;
const ROOM_ABOVE_PX = 140;

type Anchor = { readonly x: number; readonly top: number; readonly bottom: number };

function anchorOf(element: Element): Anchor {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom };
}

export type CardTipHandlers = {
  readonly onPointerEnter?: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerLeave?: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerMove?: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerUp?: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerCancel?: (event: PointerEvent<HTMLElement>) => void;
  readonly onClickCapture?: (event: MouseEvent<HTMLElement>) => void;
  readonly onContextMenu?: (event: MouseEvent<HTMLElement>) => void;
};

/**
 * Enhancement tooltip triggers: hover with a mouse; on touch a long press (the release does not play the card);
 * a plain tap toggles it on cards that cannot be played (`tapToggles`).
 */
export function useCardTip(enabled: boolean, tapToggles: boolean): { readonly anchor: Anchor | null; readonly handlers: CardTipHandlers } {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const clear = (): void => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);
  if (!enabled) return { anchor: null, handlers: {} };

  const later = (ms: number, action: () => void): void => {
    clear();
    timer.current = window.setTimeout(action, ms);
  };
  const release = (event: PointerEvent<HTMLElement>): void => {
    if (event.pointerType === 'mouse') return;
    clear();
    start.current = null;
    if (longPressed.current) setAnchor(null);
  };
  return {
    anchor,
    handlers: {
      onPointerEnter: (event) => {
        if (event.pointerType !== 'mouse') return;
        const element = event.currentTarget;
        later(HOVER_MS, () => setAnchor(anchorOf(element)));
      },
      onPointerLeave: (event) => {
        if (event.pointerType !== 'mouse') return;
        clear();
        setAnchor(null);
      },
      onPointerDown: (event) => {
        if (event.pointerType === 'mouse') return;
        longPressed.current = false;
        start.current = { x: event.clientX, y: event.clientY };
        const element = event.currentTarget;
        later(LONG_PRESS_MS, () => {
          longPressed.current = true;
          setAnchor(anchorOf(element));
        });
      },
      onPointerMove: (event) => {
        const from = start.current;
        if (!from || event.pointerType === 'mouse') return;
        if (Math.hypot(event.clientX - from.x, event.clientY - from.y) > MOVE_TOLERANCE_PX) clear();
      },
      onPointerUp: release,
      onPointerCancel: release,
      onClickCapture: (event) => {
        if (longPressed.current) {
          longPressed.current = false;
          event.stopPropagation();
          event.preventDefault();
          return;
        }
        if (!tapToggles) return;
        if (anchor) {
          setAnchor(null);
          return;
        }
        setAnchor(anchorOf(event.currentTarget));
        later(TAP_TIP_MS, () => setAnchor(null));
      },
      onContextMenu: (event) => event.preventDefault(),
    },
  };
}

/** The tooltip bubble, rendered over everything so rotated or clipped cards never cut it. */
export function CardTip({ anchor, lines }: { readonly anchor: Anchor; readonly lines: readonly TipLine[] }) {
  const above = anchor.top > ROOM_ABOVE_PX;
  const style = above
    ? { left: anchor.x, top: anchor.top - 8, translate: '-50% -100%' }
    : { left: anchor.x, top: anchor.bottom + 8, translate: '-50% 0' };
  return createPortal(
    <div className="card-tip" role="tooltip" style={style}>
      {lines.map((line) => (
        <p key={line.name} className="card-tip__line">
          <strong className="card-tip__name">
            {line.name}
            {line.owner && <span className="card-tip__owner"> · {line.owner}</span>}
          </strong>
          <span className="card-tip__text">{line.description}</span>
        </p>
      ))}
    </div>,
    document.body,
  );
}

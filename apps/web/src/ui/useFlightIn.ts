import { animate } from 'motion/react';
import { useLayoutEffect, useRef } from 'react';
import { markClaimed, planFlight, rememberLeave, rememberOrigin, takeLeave, takeOrigin, wasClaimed, type Origin } from './flight';

const FLIGHT_S = 0.4;
/** The sprite is swapped to its new size at the start of the lift, so nearly the whole flight is 1:1 and crisp. */
const SHRINK_S = 0.12;
const DEAL_STAGGER_S = 0.06;
const DISCARD_S = 0.32;

type Box = { readonly left: number; readonly top: number; readonly width: number; readonly height: number };

/** Screen px per CSS px at an element (the stage's scale): its box on screen over its layout box. */
function screenScale(el: HTMLElement): number {
  return el.offsetWidth > 0 ? el.getBoundingClientRect().width / el.offsetWidth : 1;
}

/** Plays one flight on `el`: sets the start pose at once (no flash at the destination), then one smooth move. */
function fly(el: HTMLElement, from: Origin, to: Box, k: number, delay = 0, keepSize = false): () => void {
  const plan = planFlight(from, to, k);
  const { dx, dy, tilt } = plan;
  const scale = keepSize ? 1 : plan.scale;
  el.style.transform = `translate(${dx}px, ${dy}px) rotate(${tilt}deg) scale(${scale})`;
  el.style.zIndex = '20';
  el.style.willChange = 'transform';
  // A card waiting for its turn in a deal stays out of sight instead of sitting on the deck.
  if (delay > 0) {
    el.style.opacity = '0';
    void animate(el, { opacity: [0, 1] }, { duration: 0.01, delay });
  }
  const controls = animate(
    el,
    { x: [dx, 0], y: [dy, 0], rotate: [tilt, 0], scale: [scale, 1] },
    {
      x: { duration: FLIGHT_S, delay, ease: [0.2, 0.7, 0.3, 1] },
      y: { duration: FLIGHT_S, delay, ease: [0.35, 0.05, 0.25, 1] },
      rotate: { duration: FLIGHT_S, delay, ease: 'easeOut' },
      scale: { duration: SHRINK_S, delay, ease: 'easeOut' },
    },
  );
  const reset = () => {
    el.style.zIndex = '';
    el.style.willChange = '';
    el.style.opacity = '';
  };
  void controls.then(reset);
  return () => {
    controls.stop();
    el.style.transform = '';
    reset();
  };
}

/** The deck's place on screen: where a card that has no other origin is dealt from. */
function deckOrigin(): Origin | undefined {
  const deck = document.querySelector('.deck__pile');
  if (!deck) return undefined;
  const r = deck.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height, at: Date.now() };
}

/**
 * A hand slot. It records where its card stands after every commit (a card that leaves the hand is no longer
 * rendered, so its last record is where it was taken from). A card that appears in the hand flies in from where it
 * was last seen (the table), or from the deck, one after another by `index`.
 */
export function useHandSlot<T extends HTMLElement>(id: string, index: number, enabled: boolean, placed: boolean) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const card = el?.firstElementChild;
    // `placed`: the fan has measured the hand, so the slot has its real place (the first deal waits for it).
    if (!enabled || !placed || !el || !(card instanceof HTMLElement)) return;
    card.style.transform = '';
    const seen = takeLeave(id);
    const from = seen ?? deckOrigin();
    if (!from) return;
    if (seen) markClaimed(id);
    const k = screenScale(el.parentElement ?? el);
    // A card dealt from the deck keeps its size: only a card that was on the table changes sprite size.
    return fly(card, from, card.getBoundingClientRect(), k, seen ? 0 : index * DEAL_STAGGER_S, !seen);
    // The flight belongs to the card's arrival: it must not restart when the hand is re-sorted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, enabled, placed]);
  useLayoutEffect(() => {
    const el = ref.current;
    const card = el?.firstElementChild;
    // 'none' is what a finished flight leaves behind; only a flight in progress has a pose that is not the place.
    if (el && card instanceof HTMLElement && (!card.style.transform || card.style.transform === 'none')) rememberOrigin(id, card.getBoundingClientRect());
  });
  return ref;
}

/** A card that has no place to go leaves the table sideways and fades. */
function discard(clone: HTMLElement): void {
  void animate(clone, { x: -70, y: -26, rotate: -9, opacity: 0 }, { duration: DISCARD_S, ease: 'easeIn' }).then(() => clone.remove());
}

/**
 * When a table place goes away, a copy stays behind for one frame. If a hand took the card (it flies from this
 * spot), the copy is dropped; otherwise the card was beaten and the copy is swept off the table.
 */
function leaveCopy(el: HTMLElement, id: string): void {
  const parent = el.parentElement;
  if (!parent) return;
  const since = Date.now();
  rememberLeave(id, el.getBoundingClientRect());
  const clone = el.cloneNode(true) as HTMLElement;
  clone.removeAttribute('data-score-card');
  clone.removeAttribute('data-testid');
  clone.setAttribute('aria-hidden', 'true');
  clone.style.cssText += `;position:absolute;left:${el.offsetLeft}px;top:${el.offsetTop}px;width:${el.offsetWidth}px;margin:0;z-index:15;pointer-events:none`;
  parent.appendChild(clone);
  requestAnimationFrame(() => {
    // Still in the page: a development re-run of the effect, not a real leave.
    if (el.isConnected || !parent.isConnected || wasClaimed(id, since)) clone.remove();
    else discard(clone);
  });
}

/**
 * A place on the table. A card that arrives flies in from the hand slot it left; one with no known origin slides in
 * from `fallbackY`. When `leaves` is set the place leaves a copy behind that plays the "cleared" animation.
 */
export function useTableSlot<T extends HTMLElement>(id: string, enabled: boolean, fallbackY: number, leaves: boolean) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    // A repeated run (dev StrictMode) finds the first run's pose still on the element: measure the real place.
    el.style.transform = '';
    el.style.opacity = '';
    const from = takeOrigin(id);
    const stop = (() => {
      if (!from) {
        el.style.transform = `translateY(${fallbackY}px)`;
        el.style.opacity = '0';
        const entrance = animate(el, { y: [fallbackY, 0], opacity: [0, 1] }, { type: 'spring', stiffness: 420, damping: 30 });
        return () => {
          entrance.stop();
          el.style.transform = '';
          el.style.opacity = '';
        };
      }
      return fly(el, from, el.getBoundingClientRect(), screenScale(el));
    })();
    return () => {
      stop();
      if (leaves) leaveCopy(el, id);
    };
  }, [id, enabled, fallbackY, leaves]);
  return ref;
}

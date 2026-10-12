import { JOKERS, type JokerId, type JokerState } from '@game/durak';
import { Reorder } from 'motion/react';
import type { KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useMotionEnabled } from '../../ui/useMotion';
import { PixelButton } from '../../ui/PixelButton';
import { jokerBadge } from './jokerBadge';
import { JokerFace } from './JokerFace';

type JokerSheetProps = {
  readonly jokers: readonly JokerId[];
  readonly state: JokerState;
  readonly enemyTakes: number;
  readonly onMove: (from: number, to: number) => void;
  readonly onClose: () => void;
};

/** The stack fanned out over a dimmed screen: tap a joker to read it, drag it to change the scoring order. */
export function JokerSheet({ jokers, state, enemyTakes, onMove, onClose }: JokerSheetProps) {
  const [selected, setSelected] = useState<JokerId | null>(jokers[0] ?? null);
  const motionOn = useMotionEnabled();
  const fanRef = useRef<HTMLUListElement>(null);
  const index = selected ? jokers.indexOf(selected) : -1;

  // Focus goes into the dialog and comes back to what opened it (the stack).
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    fanRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
    return () => opener?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.key === 'ArrowLeft' ? -1 : 1;
    const target = index + step;
    if (index < 0 || target < 0 || target >= jokers.length) return;
    if (event.altKey || event.ctrlKey) {
      onMove(index, target); // Alt/Ctrl + arrow: the keyboard way to reorder
    } else {
      setSelected(jokers[target] ?? null);
    }
  };
  // Selection follows the arrows: put the focus on the newly selected card (also after a reorder).
  useEffect(() => {
    fanRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
  }, [selected, jokers]);
  // Reorder reports the whole new order while dragging; each step moves the dragged joker by one place.
  const reorder = (next: JokerId[]): void => {
    const moved = next.findIndex((id, i) => id !== jokers[i]);
    if (moved < 0) return;
    const id = jokers[moved];
    if (id === undefined) return;
    onMove(moved, next.indexOf(id));
  };
  return (
    <div className="jsheet-backdrop" onClick={onClose}>
      <section className="jsheet panel" role="dialog" aria-modal="true" aria-label="Джокеры" onClick={(event) => event.stopPropagation()} onKeyDown={onKeyDown}>
        <Reorder.Group ref={fanRef} as="ul" axis="x" values={[...jokers]} onReorder={reorder} className="jsheet__fan" role="listbox" aria-label="Порядок джокеров">
          {jokers.map((id) => (
            <Reorder.Item
              key={id}
              value={id}
              // The fly-out from the stack is motion: with Effects off or reduced motion the cards just appear.
              layoutId={motionOn ? `joker-${id}` : undefined}
              tabIndex={id === selected ? 0 : -1}
              as="li"
              className={id === selected ? 'jsheet__card jsheet__card--selected' : 'jsheet__card'}
              role="option"
              aria-selected={id === selected}
              aria-label={JOKERS[id].name}
              onClick={() => setSelected(id)}
            >
              <JokerFace id={id} badge={jokerBadge(id, state, enemyTakes)} />
            </Reorder.Item>
          ))}
        </Reorder.Group>
        {selected && (
          <div className="jsheet__info" data-testid="joker-sheet-info">
            <strong className="jsheet__name">{JOKERS[selected].name}</strong>
            <span className="jsheet__text">{JOKERS[selected].description}</span>
          </div>
        )}
        <p className="jsheet__hint">Перетащи джокера, чтобы поменять порядок</p>
        <PixelButton tone="green" onClick={onClose}>
          Закрыть
        </PixelButton>
      </section>
    </div>
  );
}

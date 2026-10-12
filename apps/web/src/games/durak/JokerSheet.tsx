import { JOKERS, type JokerId, type JokerState } from '@game/durak';
import { Reorder } from 'motion/react';
import { useState } from 'react';
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

/** The stack fanned out over a dimmed screen: tap a joker to read it, drag it or use ◀ ▶ to change the scoring order. */
export function JokerSheet({ jokers, state, enemyTakes, onMove, onClose }: JokerSheetProps) {
  const [selected, setSelected] = useState<JokerId | null>(jokers[0] ?? null);
  const index = selected ? jokers.indexOf(selected) : -1;
  // Reorder reports the whole new order while dragging; each step moves the dragged joker by one place.
  const reorder = (next: JokerId[]): void => {
    const moved = next.findIndex((id, i) => id !== jokers[i]);
    if (moved < 0) return;
    const id = jokers[moved];
    if (id === undefined) return;
    onMove(moved, next.indexOf(id));
  };
  const name = selected ? JOKERS[selected].name : '';
  return (
    <div className="jsheet-backdrop" onClick={onClose}>
      <section className="jsheet panel" role="dialog" aria-modal="true" aria-label="Джокеры" onClick={(event) => event.stopPropagation()}>
        <Reorder.Group as="ul" axis="x" values={[...jokers]} onReorder={reorder} className="jsheet__fan" role="listbox" aria-label="Порядок джокеров">
          {jokers.map((id) => (
            <Reorder.Item
              key={id}
              value={id}
              layoutId={`joker-${id}`}
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
            <strong className="jsheet__name">{name}</strong>
            <span className="jsheet__text">{JOKERS[selected].description}</span>
          </div>
        )}
        <div className="jsheet__actions">
          <PixelButton tone="blue" aria-label={`${name} левее`} disabled={index <= 0} onClick={() => onMove(index, index - 1)}>
            ◀
          </PixelButton>
          <PixelButton tone="green" onClick={onClose}>
            Закрыть
          </PixelButton>
          <PixelButton tone="blue" aria-label={`${name} правее`} disabled={index < 0 || index >= jokers.length - 1} onClick={() => onMove(index, index + 1)}>
            ▶
          </PixelButton>
        </div>
      </section>
    </div>
  );
}

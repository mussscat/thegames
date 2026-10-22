import { FOCUSES, type FocusId } from '@game/durak';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { PixelButton } from '../../ui/PixelButton';
import { focusArtUrl } from '../../ui/pixel/cardArt';
import { FocusFace } from './FocusFace';
import { FOCUS_GLYPHS } from './shop/PackCardFace';
import './jokerStack.css';
import './focusStack.css';

type FocusSheetProps = {
  readonly focuses: readonly FocusId[];
  /** Slot already picked, so the sheet opens on it. */
  readonly pickedSlot: number | null;
  /** Whether the focus in this slot can be played right now (the player's turn, the rules allow it). */
  readonly usable: (slot: number) => boolean;
  /** Plays the focus; one that needs cards of the hand goes on to the action row, where they are picked. */
  readonly onPlay: (slot: number) => void;
  readonly onClose: () => void;
};

/** The focus pile fanned out over a dimmed screen: tap a focus to read it, «Сыграть» plays it (a focus that needs cards of the hand takes them from the action row). */
export function FocusSheet({ focuses, pickedSlot, usable, onPlay, onClose }: FocusSheetProps) {
  const [selected, setSelected] = useState(pickedSlot ?? 0);
  const fanRef = useRef<HTMLUListElement>(null);
  const focus = focuses[selected];

  // Focus goes into the dialog and comes back to what opened it (the pile).
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => opener?.focus();
  }, []);
  useEffect(() => {
    fanRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
  }, [selected]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      setSelected((s) => Math.min(focuses.length - 1, Math.max(0, s + (event.key === 'ArrowLeft' ? -1 : 1))));
    }
  };

  return (
    <div className="jsheet-backdrop" onClick={onClose}>
      <section className="jsheet fsheet panel" role="dialog" aria-modal="true" aria-label="Фокусы" onClick={(event) => event.stopPropagation()} onKeyDown={onKeyDown}>
        <ul ref={fanRef} className="jsheet__fan" role="listbox" aria-label="Фокусы">
          {focuses.map((id, slot) => (
            <li
              key={`${id}-${slot}`}
              tabIndex={slot === selected ? 0 : -1}
              className={slot === selected ? 'jsheet__card jsheet__card--selected' : 'jsheet__card'}
              role="option"
              aria-selected={slot === selected}
              aria-label={FOCUSES[id].name}
              onClick={() => setSelected(slot)}
            >
              {focusArtUrl(id) ? <FocusFace id={id} /> : <span className="fstack__glyph">{FOCUS_GLYPHS[id]}</span>}
            </li>
          ))}
        </ul>
        {focus && (
          <div className="jsheet__info" data-testid="focus-sheet-info">
            <strong className="jsheet__name">{FOCUSES[focus].name}</strong>
            <span className="jsheet__text">{FOCUSES[focus].description}</span>
          </div>
        )}
        <div className="fsheet__actions">
          <PixelButton
            tone="orange"
            disabled={!focus || !usable(selected)}
            onClick={() => {
              onPlay(selected);
              onClose();
            }}
          >
            Сыграть
          </PixelButton>
          <PixelButton tone="green" onClick={onClose}>
            Закрыть
          </PixelButton>
        </div>
      </section>
    </div>
  );
}

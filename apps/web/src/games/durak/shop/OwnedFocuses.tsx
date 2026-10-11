import { FOCUSES, focusSellPrice, MAX_FOCUSES, type FocusId, type RunAction } from '@game/durak';
import type { MouseEvent } from 'react';
import { CardTip, useCardTip } from '../../../components/CardTip';
import { PixelButton } from '../../../ui/PixelButton';
import { FeelBox } from '../../../ui/FeelBox';
import { PackCardFace } from './PackCardFace';
import { cardTipLines } from './shopCopy';

function FocusSlot({ id, selected, onSelect }: { readonly id: FocusId; readonly selected: boolean; readonly onSelect: () => void }) {
  const { anchor, handlers } = useCardTip(true, false);
  return (
    <li className={selected ? 'owned-focus owned-focus--selected' : 'owned-focus'}>
      <button type="button" className="owned__card" aria-label={FOCUSES[id].name} aria-pressed={selected} onClick={onSelect} {...handlers}>
        <FeelBox>
          <PackCardFace card={{ kind: 'focus', focusId: id }} />
        </FeelBox>
      </button>
      {anchor && <CardTip anchor={anchor} lines={cardTipLines({ kind: 'focus', focusId: id }, {})} />}
    </li>
  );
}

type OwnedFocusesProps = {
  readonly focuses: readonly FocusId[];
  readonly selected: number | null;
  readonly onSelect: (slot: number | null) => void;
  readonly onAct: (action: RunAction) => void;
};

/** The player's two focus slots in the shop; a tap selects one to sell. */
export function OwnedFocuses({ focuses, selected, onSelect, onAct }: OwnedFocusesProps) {
  const stop = (event: MouseEvent): void => event.stopPropagation();
  const chosen = selected === null ? undefined : focuses[selected];
  return (
    <section className="owned owned--focuses panel" data-testid="owned-focuses" aria-label="Твои фокусы" onClick={stop}>
      <ul className="owned__list">
        {Array.from({ length: MAX_FOCUSES }, (_, slot) => {
          const id = focuses[slot];
          return id ? (
            <FocusSlot key={`${id}-${slot}`} id={id} selected={selected === slot} onSelect={() => onSelect(selected === slot ? null : slot)} />
          ) : (
            <li key={`empty-${slot}`} className="owned-focus" aria-hidden="true">
              <span className="owned__empty" />
            </li>
          );
        })}
      </ul>
      <span className="owned__count">
        {focuses.length}/{MAX_FOCUSES}
      </span>
      {chosen && selected !== null && (
        <div className="owned__actions">
          <PixelButton
            tone="orange"
            small
            onClick={() => {
              onAct({ type: 'sellFocus', slot: selected });
              onSelect(null);
            }}
          >
            Продать {FOCUSES[chosen].name} за {focusSellPrice(chosen)}
          </PixelButton>
        </div>
      )}
    </section>
  );
}

import { JOKERS, MAX_JOKERS, sellPrice, type JokerId, type RunAction } from '@game/durak';
import type { MouseEvent } from 'react';
import { CardTip, useCardTip } from '../../../components/CardTip';
import { PixelButton } from '../../../ui/PixelButton';
import { TicketFace } from '../JokerTicket';
import { cardTipLines } from './shopCopy';

type OwnedTicketProps = { readonly id: JokerId; readonly selected: boolean; readonly onSelect: () => void };

function OwnedTicket({ id, selected, onSelect }: OwnedTicketProps) {
  const { anchor, handlers } = useCardTip(true, false);
  return (
    <li className={selected ? 'owned__slot owned__slot--selected' : 'owned__slot'}>
      <button type="button" className="owned__ticket" aria-label={JOKERS[id].name} aria-pressed={selected} onClick={onSelect} {...handlers}>
        <TicketFace id={id} wide={false} />
      </button>
      {anchor && <CardTip anchor={anchor} lines={cardTipLines({ kind: 'joker', jokerId: id }, {})} />}
    </li>
  );
}

type OwnedJokersProps = {
  readonly jokers: readonly JokerId[];
  readonly selected: JokerId | null;
  readonly onSelect: (id: JokerId | null) => void;
  readonly onAct: (action: RunAction) => void;
};

/** The owned jokers on top, in equal slots; a tap selects one and shows ◀ Продать ▶ under the row. */
export function OwnedJokers({ jokers, selected, onSelect, onAct }: OwnedJokersProps) {
  const index = selected ? jokers.indexOf(selected) : -1;
  const stop = (event: MouseEvent): void => event.stopPropagation();
  return (
    <section className="owned panel" data-testid="owned-jokers" aria-label="Твои джокеры" onClick={stop}>
      <ul className="owned__list">
        {jokers.map((id) => (
          <OwnedTicket key={id} id={id} selected={id === selected} onSelect={() => onSelect(id === selected ? null : id)} />
        ))}
        {Array.from({ length: Math.max(0, MAX_JOKERS - jokers.length) }, (_, i) => (
          <li key={`empty-${i}`} className="owned__slot" aria-hidden="true">
            <span className="owned__empty" />
          </li>
        ))}
      </ul>
      <span className="owned__count">
        {jokers.length}/{MAX_JOKERS}
      </span>
      {selected && index >= 0 && (
        <div className="owned__actions">
          <PixelButton tone="blue" small aria-label={`${JOKERS[selected].name} левее`} disabled={index === 0} onClick={() => onAct({ type: 'moveJoker', from: index, to: index - 1 })}>
            ◀
          </PixelButton>
          <PixelButton
            tone="orange"
            small
            onClick={() => {
              onAct({ type: 'sellJoker', jokerId: selected });
              onSelect(null);
            }}
          >
            Продать {JOKERS[selected].name} за {sellPrice(selected)}
          </PixelButton>
          <PixelButton
            tone="blue"
            small
            aria-label={`${JOKERS[selected].name} правее`}
            disabled={index === jokers.length - 1}
            onClick={() => onAct({ type: 'moveJoker', from: index, to: index + 1 })}
          >
            ▶
          </PixelButton>
        </div>
      )}
    </section>
  );
}

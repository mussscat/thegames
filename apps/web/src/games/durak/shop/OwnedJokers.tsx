import { JOKERS, MAX_JOKERS, sellPrice, type JokerId, type RunAction } from '@game/durak';
import { useState } from 'react';
import { PixelButton } from '../../../ui/PixelButton';
import { TicketFace } from '../JokerTicket';
import { DetailSheet } from './DetailSheet';
import { RARITY_NAMES } from './shopCopy';

type OwnedJokersProps = { readonly jokers: readonly JokerId[]; readonly onAct: (action: RunAction) => void };

/** The row of owned jokers across the top; a tap opens a sheet to sell or move the joker. */
export function OwnedJokers({ jokers, onAct }: OwnedJokersProps) {
  const [open, setOpen] = useState<JokerId | null>(null);
  const index = open ? jokers.indexOf(open) : -1;
  return (
    <section className="owned panel" data-testid="owned-jokers" aria-label="Твои джокеры">
      <ul className="owned__list">
        {jokers.map((id) => (
          <li key={id} className="owned__slot">
            <button type="button" className="owned__ticket" aria-label={JOKERS[id].name} onClick={() => setOpen(id)}>
              <TicketFace id={id} wide={false} />
            </button>
          </li>
        ))}
        {Array.from({ length: Math.max(0, MAX_JOKERS - jokers.length) }, (_, i) => (
          <li key={`empty-${i}`} className="owned__slot" aria-hidden="true">
            <span className="ticket ticket--placeholder" />
          </li>
        ))}
      </ul>
      <span className="owned__count">
        {jokers.length}/{MAX_JOKERS}
      </span>
      {open && index >= 0 && (
        <DetailSheet
          title={JOKERS[open].name}
          subtitle={`Редкость: ${RARITY_NAMES[JOKERS[open].rarity]}`}
          text={JOKERS[open].description}
          art={<TicketFace id={open} wide />}
          onClose={() => setOpen(null)}
          actions={
            <>
              <PixelButton tone="blue" aria-label={`${JOKERS[open].name} левее`} disabled={index === 0} onClick={() => onAct({ type: 'moveJoker', from: index, to: index - 1 })}>
                ◀
              </PixelButton>
              <PixelButton
                tone="orange"
                onClick={() => {
                  onAct({ type: 'sellJoker', jokerId: open });
                  setOpen(null);
                }}
              >
                Продать за ● {sellPrice(open)}
              </PixelButton>
              <PixelButton
                tone="blue"
                aria-label={`${JOKERS[open].name} правее`}
                disabled={index === jokers.length - 1}
                onClick={() => onAct({ type: 'moveJoker', from: index, to: index + 1 })}
              >
                ▶
              </PixelButton>
            </>
          }
        />
      )}
    </section>
  );
}

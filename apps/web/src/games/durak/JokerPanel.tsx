import { JOKERS, MAX_JOKERS, type JokerId, type JokerState } from '@game/durak';
import { useState } from 'react';
import { useMediaQuery } from '../../ui/useMediaQuery';
import { jokerBadge } from './jokerBadge';
import { TicketFace } from './JokerTicket';

/** The sidebar of a wide, tall screen has room for full tickets; elsewhere tickets are compact and open on tap. */
const WIDE_JOKERS = '(min-aspect-ratio: 5/4) and (min-height: 521px)';

function CompactTicket({ id, badge }: { readonly id: JokerId; readonly badge: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <li className={open ? 'ticket-slot ticket-slot--open' : 'ticket-slot'}>
      <button
        type="button"
        className="ticket-slot__button"
        aria-expanded={open}
        aria-label={JOKERS[id].name}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
      >
        <TicketFace id={id} wide={false} badge={badge} />
      </button>
      <span className="ticket-slot__pop" role="tooltip">
        <TicketFace id={id} wide badge={badge} />
      </span>
    </li>
  );
}

type JokerPanelProps = {
  readonly jokers: readonly JokerId[];
  readonly state: JokerState;
  /** The opponent's takes this fight (Серийный counter). */
  readonly enemyTakes: number;
};

/** The player's jokers in slot order: a framed list of tickets with live counters; an empty frame when there are none. */
export function JokerPanel({ jokers, state, enemyTakes }: JokerPanelProps) {
  const wide = useMediaQuery(WIDE_JOKERS);
  return (
    <section className={jokers.length > 0 ? 'jokers panel' : 'jokers jokers--empty panel'} aria-label="Джокеры">
      <header className="jokers__head">
        <h3 className="jokers__title">Джокеры</h3>
        <span className="jokers__count">
          {jokers.length}/{MAX_JOKERS}
        </span>
      </header>
      <ul className={wide ? 'jokers__list jokers__list--wide' : 'jokers__list'}>
        {jokers.map((id) => {
          const badge = jokerBadge(id, state, enemyTakes);
          return wide ? (
            <li key={id} className="ticket-slot" aria-label={JOKERS[id].name}>
              <TicketFace id={id} wide badge={badge} />
            </li>
          ) : (
            <CompactTicket key={id} id={id} badge={badge} />
          );
        })}
        {!wide &&
          Array.from({ length: Math.max(0, MAX_JOKERS - jokers.length) }, (_, i) => (
            <li key={`empty-${i}`} className="ticket-slot" aria-hidden="true">
              <span className="ticket ticket--placeholder" />
            </li>
          ))}
      </ul>
    </section>
  );
}

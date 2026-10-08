import { MAX_PERKS, PERKS, type PerkId } from '@game/durak';
import { useState } from 'react';
import { useMediaQuery } from '../../ui/useMediaQuery';
import { TicketFace } from './PerkTicket';

/** The sidebar of a wide, tall screen has room for full tickets; elsewhere tickets are compact and open on tap. */
const WIDE_PERKS = '(min-aspect-ratio: 5/4) and (min-height: 521px)';

function CompactTicket({ id }: { readonly id: PerkId }) {
  const [open, setOpen] = useState(false);
  return (
    <li className={open ? 'ticket-slot ticket-slot--open' : 'ticket-slot'}>
      <button
        type="button"
        className="ticket-slot__button"
        aria-expanded={open}
        aria-label={PERKS[id].name}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
      >
        <TicketFace id={id} wide={false} />
      </button>
      <span className="ticket-slot__pop" role="tooltip">
        <TicketFace id={id} wide />
      </span>
    </li>
  );
}

/** The player's perks: a framed list of tickets; an empty frame when there are none. */
export function PerkPanel({ perks }: { readonly perks: readonly PerkId[] }) {
  const wide = useMediaQuery(WIDE_PERKS);
  return (
    <section className={perks.length > 0 ? 'perks panel' : 'perks perks--empty panel'} aria-label="Перки">
      <header className="perks__head">
        <h3 className="perks__title">Перки</h3>
        <span className="perks__count">
          {perks.length}/{MAX_PERKS}
        </span>
      </header>
      <ul className={wide ? 'perks__list perks__list--wide' : 'perks__list'}>
        {perks.map((id) =>
          wide ? (
            <li key={id} className="ticket-slot" aria-label={PERKS[id].name}>
              <TicketFace id={id} wide />
            </li>
          ) : (
            <CompactTicket key={id} id={id} />
          ),
        )}
        {!wide &&
          Array.from({ length: Math.max(0, MAX_PERKS - perks.length) }, (_, i) => (
            <li key={`empty-${i}`} className="ticket-slot" aria-hidden="true">
              <span className="ticket ticket--placeholder" />
            </li>
          ))}
      </ul>
    </section>
  );
}

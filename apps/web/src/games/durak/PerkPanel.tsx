import { MAX_PERKS, PERK_IDS, PERKS, type PerkId } from '@game/durak';
import { useState } from 'react';
import { emblemUrl } from '../../ui/pixel/perkEmblem';
import { useMediaQuery } from '../../ui/useMediaQuery';

/** The sidebar of a wide, tall screen has room for full tickets; elsewhere tickets are compact and open on tap. */
const WIDE_PERKS = '(min-aspect-ratio: 5/4) and (min-height: 521px)';

function serial(id: PerkId): string {
  return `№ ${String(PERK_IDS.indexOf(id) + 1).padStart(3, '0')}`;
}

/** A perk drawn as a lottery ticket: picture on a perforated stub, name and rule on the body. */
function TicketFace({ id, wide }: { readonly id: PerkId; readonly wide: boolean }) {
  return (
    <span className={wide ? 'ticket ticket--wide' : 'ticket'}>
      <span className="ticket__stub">
        <img className="sprite ticket__art" src={emblemUrl(id)} alt="" draggable={false} />
      </span>
      {wide && (
        <span className="ticket__body">
          <strong className="ticket__name">{PERKS[id].name}</strong>
          <span className="ticket__text">{PERKS[id].description}</span>
          <span className="ticket__serial">{serial(id)}</span>
        </span>
      )}
    </span>
  );
}

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
      </ul>
    </section>
  );
}

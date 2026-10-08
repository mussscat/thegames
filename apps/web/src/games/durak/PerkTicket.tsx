import { PERK_IDS, PERKS, type PerkId } from '@game/durak';
import { emblemUrl } from '../../ui/pixel/perkEmblem';

function serial(id: PerkId): string {
  return `№ ${String(PERK_IDS.indexOf(id) + 1).padStart(3, '0')}`;
}

/** A perk drawn as a lottery ticket: picture on a perforated stub, name and rule on the body. */
export function TicketFace({ id, wide }: { readonly id: PerkId; readonly wide: boolean }) {
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

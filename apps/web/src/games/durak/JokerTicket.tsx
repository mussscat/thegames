import { JOKER_IDS, JOKERS, type JokerId } from '@game/durak';
import { emblemUrl } from '../../ui/pixel/jokerEmblem';

function serial(id: JokerId): string {
  return `№ ${String(JOKER_IDS.indexOf(id) + 1).padStart(3, '0')}`;
}

type TicketFaceProps = {
  readonly id: JokerId;
  readonly wide: boolean;
  /** A live counter («заряд +8», «+2 множ.»), shown on the stub. */
  readonly badge?: string | null;
};

/** A joker drawn as a lottery ticket: picture on a perforated stub (tinted by rarity), name and rule on the body. */
export function TicketFace({ id, wide, badge = null }: TicketFaceProps) {
  const joker = JOKERS[id];
  const classes = ['ticket', wide ? 'ticket--wide' : '', `ticket--${joker.rarity}`].filter(Boolean).join(' ');
  return (
    <span className={classes}>
      <span className="ticket__stub">
        <img className="sprite ticket__art" src={emblemUrl(id)} alt="" draggable={false} />
        {badge && <span className="ticket__badge">{badge}</span>}
      </span>
      {wide && (
        <span className="ticket__body">
          <strong className="ticket__name">{joker.name}</strong>
          <span className="ticket__text">{joker.description}</span>
          <span className="ticket__serial">{serial(id)}</span>
        </span>
      )}
    </span>
  );
}

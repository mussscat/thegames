import { MAX_PERKS, PERKS, type PerkId } from '@game/durak';
import { emblemUrl } from '../../ui/pixel/perkEmblem';

/** The player's perks as a row of small jokers, like Balatro's joker tray. */
export function PerkRow({ perks }: { readonly perks: readonly PerkId[] }) {
  return (
    <div className="perk-row">
      <div className="perk-row__tray">
        {perks.map((id) => (
          <div key={id} className="perk-row__perk" title={PERKS[id].description}>
            <img className="sprite perk-row__emblem" src={emblemUrl(id)} alt="" draggable={false} />
            <span className="perk-row__name">{PERKS[id].name}</span>
          </div>
        ))}
      </div>
      <span className="perk-row__count">
        Перки {perks.length}/{MAX_PERKS}
      </span>
    </div>
  );
}

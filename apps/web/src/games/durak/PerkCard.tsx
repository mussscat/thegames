import { PERKS, type PerkId } from '@game/durak';
import type { ReactNode } from 'react';
import { emblemUrl } from '../../ui/pixel/perkEmblem';

type PerkCardProps = { readonly perkId: PerkId; readonly action: ReactNode };

/** A perk shown like a Balatro joker: emblem, name, rule and a price/sell button underneath. */
export function PerkCard({ perkId, action }: PerkCardProps) {
  const perk = PERKS[perkId];
  return (
    <article className="joker">
      <img className="sprite joker__emblem" src={emblemUrl(perkId)} alt="" draggable={false} />
      <h4 className="joker__name">{perk.name}</h4>
      <p className="joker__text">{perk.description}</p>
      {action}
    </article>
  );
}

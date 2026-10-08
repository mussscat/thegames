import { JOKERS, type JokerId, type Rarity } from '@game/durak';
import type { ReactNode } from 'react';
import { emblemUrl } from '../../ui/pixel/jokerEmblem';

const RARITY_NAMES: Readonly<Record<Rarity, string>> = { common: 'Обычный', rare: 'Редкий', legendary: 'Легендарный' };

type JokerCardProps = { readonly jokerId: JokerId; readonly action: ReactNode };

/** A joker as in a Balatro shop: emblem, name, rarity, rule and a price/sell row underneath. */
export function JokerCard({ jokerId, action }: JokerCardProps) {
  const joker = JOKERS[jokerId];
  return (
    <article className={`joker joker--${joker.rarity}`}>
      <img className="sprite joker__emblem" src={emblemUrl(jokerId)} alt="" draggable={false} />
      <h4 className="joker__name">{joker.name}</h4>
      <span className="joker__rarity">{RARITY_NAMES[joker.rarity]}</span>
      <p className="joker__text">{joker.description}</p>
      {action}
    </article>
  );
}

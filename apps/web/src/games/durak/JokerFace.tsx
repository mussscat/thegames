import { JOKERS, type JokerId } from '@game/durak';
import { useCardSize } from '../../ui/CardSizeContext';
import { jokerArtUrl, plainArtUrl } from '../../ui/pixel/cardArt';
import { emblemUrl } from '../../ui/pixel/jokerEmblem';
import './JokerFace.css';

type JokerFaceProps = {
  readonly id: JokerId;
  /** A live counter («заряд +8», «+2 множ.») on a tag at the bottom of the card. */
  readonly badge?: string | null;
};

/**
 * A joker as a card: its character on the background of its rarity. If the sprites did not load, a procedural
 * emblem on a plain card stands in. The name and rule live in the tooltip.
 */
export function JokerFace({ id, badge = null }: JokerFaceProps) {
  const joker = JOKERS[id];
  const size = useCardSize();
  const art = jokerArtUrl(id, size);
  const paper = plainArtUrl();
  return (
    <span className={`jface jface--${joker.rarity}`}>
      {art ? (
        <img className="sprite jface__art" src={art} alt="" draggable={false} />
      ) : (
        <>
          {paper ? <img className="sprite jface__art" src={paper} alt="" draggable={false} /> : <span className="jface__paper" />}
          <img className="sprite jface__emblem" src={emblemUrl(id)} alt="" draggable={false} />
        </>
      )}
      {badge && <span className="jface__badge">{badge}</span>}
    </span>
  );
}

import { isRedSuit, rankLabel, type Card } from '@game/core';
import type { EnhancementId } from '@game/durak';
import { frontUrl } from './pixel/cardSprite';

type CardFaceProps = {
  readonly card: Card;
  readonly enhancement?: EnhancementId;
  /** Both enhancements available: own half top-right (icon top-right), foreign half bottom-left (icon bottom-left). */
  readonly split?: { readonly own: EnhancementId; readonly foreign: EnhancementId };
};

export function CardFace({ card, enhancement, split }: CardFaceProps) {
  const rankClass = isRedSuit(card.suit) ? 'face__rank face__rank--red' : 'face__rank';
  const rank = rankLabel(card.rank);
  return (
    <div className="face">
      {split ? (
        <>
          <img className="sprite face__sprite face__sprite--own" src={frontUrl(card, split.own)} alt="" draggable={false} />
          <img className="sprite face__sprite face__sprite--foreign" src={frontUrl(card, split.foreign, 'bottomLeft')} alt="" draggable={false} />
        </>
      ) : (
        <img className="sprite face__sprite" src={frontUrl(card, enhancement)} alt="" draggable={false} />
      )}
      <span className={rankClass}>{rank}</span>
      <span className={`${rankClass} face__rank--bottom`}>{rank}</span>
    </div>
  );
}

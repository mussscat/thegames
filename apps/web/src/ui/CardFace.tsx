import { isRedSuit, rankLabel, type Card } from '@game/core';
import type { EnhancementId } from '@game/durak';
import { frontUrl } from './pixel/cardSprite';
import { useCardSize } from './CardSizeContext';
import { enhancementArtUrl, plainArtUrl, suitLayerUrl, type CardSize } from './pixel/cardArt';

type CardFaceProps = {
  readonly card: Card;
  readonly enhancement?: EnhancementId;
  /** Both enhancements available: own half top-right, foreign half bottom-left, split along the diagonal. */
  readonly split?: { readonly own: EnhancementId; readonly foreign: EnhancementId };
};

type ArtLayers = { readonly own: string; readonly foreign?: string };

/** Sprite-sheet art for the card; undefined when its sheet did not load (the canvas art is drawn instead). */
function artLayers(enhancement: EnhancementId | undefined, split: CardFaceProps['split'], size: CardSize): ArtLayers | undefined {
  if (split) {
    const own = enhancementArtUrl(split.own, size);
    const foreign = enhancementArtUrl(split.foreign, size);
    return own && foreign ? { own, foreign } : undefined;
  }
  const own = enhancement ? enhancementArtUrl(enhancement, size) : plainArtUrl(size);
  return own ? { own } : undefined;
}

export function CardFace({ card, enhancement, split }: CardFaceProps) {
  const rank = rankLabel(card.rank);
  const rankClass = ['face__rank', isRedSuit(card.suit) && 'face__rank--red', rank.length > 1 && 'face__rank--long'].filter(Boolean).join(' ');
  const size = useCardSize();
  const art = artLayers(enhancement, split, size);
  const ranks = (
    <>
      <span className={rankClass}>{rank}</span>
      <span className={`${rankClass} face__rank--bottom`}>{rank}</span>
    </>
  );
  if (art) {
    return (
      <div className={['face', 'face--art', size === 's' && 'face--s', (enhancement || split) && 'face--enhanced', enhancement === 'golden' && 'face--golden'].filter(Boolean).join(' ')}>
        <img className={art.foreign ? 'sprite face__sprite face__sprite--own' : 'sprite face__sprite'} src={art.own} alt="" draggable={false} />
        {art.foreign && <img className="sprite face__sprite face__sprite--foreign" src={art.foreign} alt="" draggable={false} />}
        <img className="sprite face__sprite" src={suitLayerUrl(card, !enhancement && !split, size)} alt="" draggable={false} />
        {ranks}
      </div>
    );
  }
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
      {ranks}
    </div>
  );
}

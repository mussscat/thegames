import { isRedSuit } from '@game/core';
import type { RoundState } from '@game/durak';
import { CardBack, CardView } from '../../../components/CardView';
import { PixelIcon } from '../../../components/pixel/PixelIcon';
import { PixelText } from '../../../components/pixel/PixelText';
import { SuitMark } from '../../../ui/SuitMark';

type PixelDeckViewProps = { readonly round: RoundState; readonly revealTop: boolean; /** Top cards shown face up (Прорицание). */ readonly peek?: number };

/** The deck pile on the pixel stage: the same pile as `DeckView`, with the count and the trump on kit text and a native deck icon. */
export function PixelDeckView({ round, revealTop, peek = 0 }: PixelDeckViewProps) {
  const top = round.deck[0];
  const showTopFaceUp = revealTop && round.deck.length > 1 && top !== undefined;
  const stack = Math.min(3, Math.max(0, round.deck.length - 1));
  return (
    <div className="deck pdeck" data-testid="deck">
      {peek > 0 && (
        <div className="deck__peek" data-testid="deck-peek">
          {round.deck.slice(0, Math.min(peek, Math.max(0, round.deck.length - 1))).map((card) => (
            <CardView key={card.id} card={card} />
          ))}
        </div>
      )}
      <div className="deck__pile">
        {round.deck.length === 0 && <span className="deck__hole px-slot-empty" aria-hidden="true" />}
        {round.deck.length > 0 && (
          <div className="deck__trump-card">
            <CardView card={round.trumpCard} />
          </div>
        )}
        {Array.from({ length: stack }, (_, i) => (
          <div key={i} className="deck__layer" style={{ transform: `translate(${-i * 2}px, ${-i * 2}px)` }}>
            {i === stack - 1 && showTopFaceUp ? <CardView card={top} /> : <CardBack />}
          </div>
        ))}
      </div>
      <div className="pdeck__info">
        <span className="pdeck__count">
          <PixelIcon name="deck" />
          <span className="deck__label">Колода: </span>
          <PixelText>{round.deck.length}</PixelText>
        </span>
        <span className="pdeck__trump">
          <span className="deck__label">Козырь </span>
          <span className={isRedSuit(round.trumpSuit) ? 'deck__suit deck__suit--red' : 'deck__suit'}>
            <SuitMark suit={round.trumpSuit} />
          </span>
          {round.boss === 'witch' && <PixelText size="s"> + дамы</PixelText>}
          {round.boss === 'shuffler' && <PixelText size="s"> (меняется)</PixelText>}
        </span>
      </div>
    </div>
  );
}

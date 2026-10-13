import { isRedSuit } from '@game/core';
import type { RoundState } from '@game/durak';
import { CardBack, CardView } from '../../components/CardView';
import { Icon } from '../../ui/Icon';
import { SuitMark } from '../../ui/SuitMark';

type DeckViewProps = { readonly round: RoundState; readonly revealTop: boolean; /** Top cards shown face up (Прорицание). */ readonly peek?: number };

export function DeckView({ round, revealTop, peek = 0 }: DeckViewProps) {
  const top = round.deck[0];
  const showTopFaceUp = revealTop && round.deck.length > 1 && top !== undefined;
  const stack = Math.min(3, Math.max(0, round.deck.length - 1));
  return (
    <div className="deck" data-testid="deck">
      {peek > 0 && (
        <div className="deck__peek" data-testid="deck-peek">
          {round.deck.slice(0, Math.min(peek, Math.max(0, round.deck.length - 1))).map((card) => (
            <CardView key={card.id} card={card} />
          ))}
        </div>
      )}
      <div className="deck__pile">
        {/* An empty deck is drawn as an empty slot (like the jokers' empty stack), never as nothing. */}
        {round.deck.length === 0 && <span className="deck__hole" aria-hidden="true" />}
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
      <div className="deck__info">
      <span className="chip deck__count">
        <Icon id="deck" /> <span className="deck__label">Колода: </span>
        {round.deck.length}
      </span>
      <span className="chip deck__trump">
        <span className="deck__label">Козырь </span> <span className={isRedSuit(round.trumpSuit) ? 'deck__suit deck__suit--red' : 'deck__suit'}><SuitMark suit={round.trumpSuit} />
        </span>
        {round.boss === 'witch' && ' + дамы'}
        {round.boss === 'shuffler' && ' (меняется)'}
      </span>
      </div>
    </div>
  );
}

import { isRedSuit, SUIT_SYMBOLS } from '@game/core';
import type { RoundState } from '@game/durak';
import { CardBack, CardView } from '../../components/CardView';

type DeckViewProps = { readonly round: RoundState; readonly revealTop: boolean };

export function DeckView({ round, revealTop }: DeckViewProps) {
  const top = round.deck[0];
  const showTopFaceUp = revealTop && round.deck.length > 1 && top !== undefined;
  const stack = Math.min(3, Math.max(0, round.deck.length - 1));
  return (
    <div className="deck" data-testid="deck">
      <div className="deck__pile">
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
      <span className="chip deck__count">{round.deck.length > 0 ? `Колода: ${round.deck.length}` : 'Колода пуста'}</span>
      <span className="chip deck__trump">
        Козырь <span className={isRedSuit(round.trumpSuit) ? 'deck__suit deck__suit--red' : 'deck__suit'}>{SUIT_SYMBOLS[round.trumpSuit]}</span>
        {round.boss === 'witch' && ' + дамы'}
        {round.boss === 'shuffler' && ' (меняется)'}
      </span>
    </div>
  );
}

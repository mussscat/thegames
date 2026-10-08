import { SUIT_SYMBOLS } from '@game/core';
import { isTrumpCard, type RoundState } from '@game/durak';
import { CardBack, CardView } from '../../components/CardView';

type DeckViewProps = { readonly round: RoundState; readonly revealTop: boolean };

export function DeckView({ round, revealTop }: DeckViewProps) {
  const top = round.deck[0];
  const showTopFaceUp = revealTop && round.deck.length > 1 && top !== undefined;
  return (
    <div className="deck" data-testid="deck">
      {round.deck.length > 1 && (showTopFaceUp ? <CardView card={top} /> : <CardBack />)}
      {round.deck.length > 0 && <CardView card={round.trumpCard} trump={isTrumpCard(round.trumpCard, round.trumpSuit, round.boss)} />}
      <span className="deck__count">{round.deck.length > 0 ? `Колода: ${round.deck.length}` : 'Колода пуста'}</span>
      <span className="deck__trump">
        Козырь {SUIT_SYMBOLS[round.trumpSuit]}
        {round.boss === 'witch' && ' + дамы'}
        {round.boss === 'shuffler' && ' (меняется)'}
      </span>
    </div>
  );
}

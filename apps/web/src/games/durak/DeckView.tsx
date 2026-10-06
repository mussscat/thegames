import { SUIT_SYMBOLS } from '@game/core';
import type { RoundState } from '@game/durak';
import { CardBack, CardView } from '../../components/CardView';

export function DeckView({ round }: { readonly round: RoundState }) {
  return (
    <div className="deck" data-testid="deck">
      {round.deck.length > 1 && <CardBack />}
      {round.deck.length > 0 && <CardView card={round.trumpCard} trump />}
      <span className="deck__count">{round.deck.length > 0 ? `Колода: ${round.deck.length}` : 'Колода пуста'}</span>
      <span className="deck__trump">Козырь {SUIT_SYMBOLS[round.trumpSuit]}</span>
    </div>
  );
}

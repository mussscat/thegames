import type { Card } from '@game/core';
import { currentActor, legalActions } from '@game/durak';
import { LayoutGroup } from 'motion/react';
import { CardBack, CardView } from '../../components/CardView';
import { HpBar } from '../../components/HpBar';
import { ActionBar } from './ActionBar';
import { DeckView } from './DeckView';
import { FightOverlay } from './FightOverlay';
import { statusText } from './status';
import { TableView } from './TableView';
import { useDurakFight } from './useDurakFight';

type DurakFightScreenProps = {
  readonly seed: number;
  readonly onExit: () => void;
  readonly onRestart: () => void;
};

export function DurakFightScreen({ seed, onExit, onRestart }: DurakFightScreenProps) {
  const { state, error, act } = useDurakFight(seed);
  const { round } = state;
  const myTurn = !state.winner && currentActor(round) === 'player';
  const defending = myTurn && round.attacker === 'enemy';
  const playableIds = new Set(
    legalActions(round, 'player').flatMap((action) => ('cardId' in action ? [action.cardId] : [])),
  );

  const onCardTap = (card: Card): void =>
    act(defending ? { type: 'defend', cardId: card.id } : { type: 'attack', cardId: card.id });

  return (
    <LayoutGroup>
      <main className="screen fight">
        <header className="fight__header">
          <button type="button" className="btn btn--small" onClick={onExit}>
            Меню
          </button>
          <span className="fight__round">Раздача {state.roundNumber}</span>
        </header>

        <HpBar label="Соперник" hp={state.hp.enemy} maxHp={state.maxHp.enemy} />
        <div className="hand hand--enemy" data-testid="enemy-hand">
          {round.hands.enemy.map((card) => (
            <CardBack key={card.id} layoutId={card.id} />
          ))}
        </div>

        <div className="fight__middle">
          <DeckView round={round} />
          <TableView table={round.table} />
        </div>

        <p className="fight__status" role="status">
          {error ?? statusText(state)}
        </p>
        <ActionBar round={round} myTurn={myTurn} onAct={act} />

        <div className={myTurn ? 'hand hand--player' : 'hand hand--player hand--waiting'} data-testid="player-hand">
          {round.hands.player.map((card) => (
            <CardView
              key={card.id}
              card={card}
              playable={myTurn && playableIds.has(card.id)}
              trump={card.suit === round.trumpSuit}
              onTap={myTurn ? () => onCardTap(card) : undefined}
            />
          ))}
        </div>
        <HpBar label="Ты" hp={state.hp.player} maxHp={state.maxHp.player} />
      </main>
      <FightOverlay state={state} onNextRound={() => act({ type: 'nextRound' })} onRestart={onRestart} onExit={onExit} />
    </LayoutGroup>
  );
}

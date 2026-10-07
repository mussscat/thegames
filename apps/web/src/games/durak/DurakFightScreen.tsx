import type { Card } from '@game/core';
import { currentActor, legalActions, revealsTopCard, type FightAction, type FightState } from '@game/durak';
import { LayoutGroup } from 'motion/react';
import type { ReactNode } from 'react';
import { CardBack, CardView } from '../../components/CardView';
import { HpBar } from '../../components/HpBar';
import { ActionBar } from './ActionBar';
import { DeckView } from './DeckView';
import { FightOverlay } from './FightOverlay';
import { hitLabelFor } from './hits';
import { statusText } from './status';
import { TableView } from './TableView';

type DurakFightScreenProps = {
  readonly fight: FightState;
  readonly error: string | null;
  readonly header: ReactNode;
  readonly onFightAction: (action: FightAction) => void;
  readonly onLeaveFight: () => void;
  readonly onExit: () => void;
};

export function DurakFightScreen({ fight, error, header, onFightAction, onLeaveFight, onExit }: DurakFightScreenProps) {
  const { round } = fight;
  const myTurn = !fight.winner && currentActor(round) === 'player';
  const defending = myTurn && round.attacker === 'enemy';
  const playableIds = new Set(
    legalActions(round, 'player').flatMap((action) => ('cardId' in action ? [action.cardId] : [])),
  );

  const onCardTap = (card: Card): void =>
    onFightAction(defending ? { type: 'defend', cardId: card.id } : { type: 'attack', cardId: card.id });

  return (
    <LayoutGroup>
      <main className="screen fight">
        <header className="fight__header">
          <button type="button" className="btn btn--small" onClick={onExit}>
            Меню
          </button>
          <span className="fight__round">Раздача {fight.roundNumber}</span>
        </header>
        {header}

        <HpBar
          label="Соперник"
          hp={fight.hp.enemy}
          maxHp={fight.maxHp.enemy}
          hitLabel={hitLabelFor(fight.hits, 'enemy')}
          hitKey={fight.hitSeq}
        />
        <div className="hand hand--enemy" data-testid="enemy-hand">
          {round.hands.enemy.map((card) => (
            <CardBack key={card.id} layoutId={card.id} />
          ))}
        </div>

        <div className="fight__middle">
          <DeckView round={round} revealTop={revealsTopCard(fight.perks)} />
          <TableView table={round.table} />
        </div>

        <p className="fight__status" role="status">
          {error ?? statusText(fight)}
        </p>
        <ActionBar round={round} myTurn={myTurn} onAct={onFightAction} />

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
        <HpBar
          label="Ты"
          hp={fight.hp.player}
          maxHp={fight.maxHp.player}
          hitLabel={hitLabelFor(fight.hits, 'player')}
          hitKey={fight.hitSeq}
        />
      </main>
      <FightOverlay state={fight} onNextRound={() => onFightAction({ type: 'nextRound' })} onLeaveFight={onLeaveFight} />
    </LayoutGroup>
  );
}

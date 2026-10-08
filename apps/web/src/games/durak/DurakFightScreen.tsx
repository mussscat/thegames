import type { Card } from '@game/core';
import {
  currentActor,
  revealsTopCard,
  type EnhancementSource,
  type FightAction,
  type FightState,
  type RunState,
} from '@game/durak';
import { LayoutGroup } from 'motion/react';
import { useEffect } from 'react';
import { HpBar } from '../../components/HpBar';
import { PixelButton } from '../../ui/PixelButton';
import { useSettings } from '../../ui/SettingsContext';
import { usePrevious } from '../../ui/usePrevious';
import { ActionBar } from './ActionBar';
import { DeckView } from './DeckView';
import { EnemyHand, PlayerHand } from './FightHands';
import { FightOverlay } from './FightOverlay';
import { FightStats } from './FightStats';
import { JokerPanel } from './JokerPanel';
import { RunHeader } from './RunHeader';
import { HitPop } from './HitPop';
import { hitInfoFor } from './hits';
import { fightSound, isNewError } from './sounds';
import { statusText } from './status';
import { TableView } from './TableView';
import './fight.css';

function hitPop(info: ReturnType<typeof hitInfoFor>) {
  return info ? <HitPop hit={info} /> : null;
}

type DurakFightScreenProps = {
  readonly fight: FightState;
  readonly error: string | null;
  readonly errorSeq: number;
  readonly run: RunState;
  readonly onFightAction: (action: FightAction) => void;
  readonly onLeaveFight: () => void;
  readonly onExit: () => void;
};

export function DurakFightScreen({ fight, error, errorSeq, run, onFightAction, onLeaveFight, onExit }: DurakFightScreenProps) {
  const { settings, play: playSfx } = useSettings();
  const { round } = fight;
  const previous = usePrevious(fight);
  useEffect(() => {
    if (!previous || previous === fight) return;
    const sound = fightSound(previous, fight);
    if (sound) playSfx(sound);
  }, [fight, previous, playSfx]);
  const previousErrorSeq = usePrevious(errorSeq);
  useEffect(() => {
    if (isNewError(previousErrorSeq, errorSeq)) playSfx('deny');
  }, [errorSeq, previousErrorSeq, playSfx]);
  const myTurn = !fight.winner && currentActor(round) === 'player';
  const defending = myTurn && round.attacker === 'enemy';
  const play = (card: Card, use?: EnhancementSource): void => {
    const base = defending ? { type: 'defend' as const, cardId: card.id } : { type: 'attack' as const, cardId: card.id };
    onFightAction(use ? { ...base, use } : base);
  };

  return (
    <LayoutGroup>
      <main className="screen fight">
        {/* Portrait: both wrappers are `display: contents` and a grid places each child; landscape: two columns. */}
        <aside className="fight__side">
          <RunHeader run={run} />
          <HpBar
            label="Соперник"
            className="hp--enemy"
            hp={fight.hp.enemy}
            maxHp={fight.maxHp.enemy}
            hit={hitPop(hitInfoFor(fight.hits, 'enemy', fight.lastScore))}
            hitKey={fight.hitSeq}
          />
          <HpBar
            label="Ты"
            className="hp--player"
            hp={fight.hp.player}
            maxHp={fight.maxHp.player}
            hit={hitPop(hitInfoFor(fight.hits, 'player', fight.lastScore))}
            hitKey={fight.hitSeq}
          />
          <FightStats coins={run.coins} roundNumber={fight.roundNumber} />
          <JokerPanel jokers={fight.jokers.player} state={fight.jokerState.player} enemyTakes={fight.fightTakes.enemy} />
          <PixelButton tone="orange" className="fight__menu" onClick={onExit}>
            Меню
          </PixelButton>
          <ActionBar round={round} myTurn={myTurn} onAct={onFightAction} />
        </aside>
        <section className="fight__board">
          <EnemyHand cards={round.hands.enemy} />
          <TableView table={round.table} attacker={round.attacker} />
          <p className="fight__status panel" role="status">
            {error ?? statusText(fight)}
          </p>
          <PlayerHand round={round} myTurn={myTurn} sway={settings.sway} sort={settings.sort} onPlay={play} />
          <DeckView round={round} revealTop={revealsTopCard(fight.jokers.player)} />
        </section>
      </main>
      <FightOverlay state={fight} onNextRound={() => onFightAction({ type: 'nextRound' })} onLeaveFight={onLeaveFight} />
    </LayoutGroup>
  );
}

import type { Card } from '@game/core';
import {
  currentActor,
  FOCUSES,
  revealsTopCard,
  type EnhancementSource,
  type FightAction,
  type FightState,
  type RunState,
  type ScoredHit,
} from '@game/durak';
import { LayoutGroup } from 'motion/react';
import { useEffect, useState } from 'react';
import { HpBar } from '../../components/HpBar';
import { PixelButton } from '../../ui/PixelButton';
import { useSettings } from '../../ui/SettingsContext';
import { usePrevious } from '../../ui/usePrevious';
import { ActionBar } from './ActionBar';
import { DeckView } from './DeckView';
import { EnemyHand, PlayerHand } from './FightHands';
import { FightOverlay } from './FightOverlay';
import { FightStats } from './FightStats';
import { FocusBar, type FocusPick } from './FocusBar';
import { chargeChips, toggleTarget } from './focusView';
import { Icon } from '../../ui/Icon';
import { firingJoker } from './firingJoker';
import { JokerStack } from './JokerStack';
import { EnemyBadge } from './EnemyBadge';
import { ScoreBoard } from './ScoreBoard';
import { ScorePops } from './ScorePops';
import { fightSound, isNewError } from './sounds';
import { statusText } from './status';
import { TableView } from './TableView';
import { useScorePlayback } from './useScorePlayback';
import './fight.css';
import './score.css';

type DurakFightScreenProps = {
  readonly fight: FightState;
  readonly error: string | null;
  readonly errorSeq: number;
  readonly run: RunState;
  /** The take being replayed (the screen shows the state before it), or null. */
  readonly scoring: ScoredHit | null;
  readonly onScoringDone: () => void;
  readonly onFightAction: (action: FightAction) => void;
  readonly onLeaveFight: () => void;
  readonly onExit: () => void;
  readonly onUseFocus: (slot: number, targets: readonly string[]) => void;
};

export function DurakFightScreen({ fight, error, errorSeq, run, scoring, onScoringDone, onFightAction, onLeaveFight, onExit, onUseFocus }: DurakFightScreenProps) {
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
  const playback = useScorePlayback(scoring, settings.animSpeed, onScoringDone);
  const myTurn = !playback.active && !fight.winner && currentActor(round) === 'player';
  const defending = myTurn && round.attacker === 'enemy';
  const focuses = run.focuses;
  const [focusPick, setFocusPick] = useState<FocusPick | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => setFocusPick(null), [fight.roundNumber]);
  const pickedId = focusPick ? focuses[focusPick.slot] : undefined;
  const targeting =
    focusPick && pickedId && FOCUSES[pickedId].maxTargets > 0
      ? { picked: focusPick.targets, onPick: (card: Card) => setFocusPick({ ...focusPick, targets: toggleTarget(focusPick.targets, card.id, FOCUSES[pickedId].maxTargets) }) }
      : null;
  const play = (card: Card, use?: EnhancementSource): void => {
    const base = defending ? { type: 'defend' as const, cardId: card.id } : { type: 'attack' as const, cardId: card.id };
    onFightAction(use ? { ...base, use } : base);
  };

  return (
    <LayoutGroup>
      <main className="screen fight">
        {/* Portrait: both wrappers are `display: contents` and a grid places each child; landscape: two columns. */}
        <aside className="fight__side">
          <HpBar
            label="Соперник"
            lead={<EnemyBadge run={run} />}
            className="hp--enemy"
            hp={fight.hp.enemy}
            maxHp={fight.maxHp.enemy}
            shakeKey={fight.hits.some((h) => h.target === 'enemy') ? fight.hitSeq : 0}
            scoreTarget="enemy"
          />
          <HpBar
            label="Ты"
            className="hp--player"
            hp={fight.hp.player}
            maxHp={fight.maxHp.player}
            shakeKey={fight.hits.some((h) => h.target === 'player') ? fight.hitSeq : 0}
            scoreTarget="player"
          />
          {chargeChips(fight.focusCharges).length > 0 && (
            <p className="charges" data-testid="focus-charges">
              {chargeChips(fight.focusCharges).map((chip) => (
                <span key={chip.text} className="chip">
                  <Icon id={chip.icon} /> {chip.text}
                </span>
              ))}
            </p>
          )}
          <FightStats coins={run.coins} roundNumber={fight.roundNumber} />
          <JokerStack
            jokers={fight.jokers.player}
            state={fight.jokerState.player}
            enemyTakes={fight.fightTakes.enemy}
            firing={firingJoker(playback.current)}
            disabled={playback.active}
            onOpen={() => setSheetOpen(true)}
          />
          <FocusBar
            focuses={focuses}
            fight={fight}
            myTurn={myTurn}
            pick={focusPick}
            onPick={setFocusPick}
            onPlay={(pick) => {
              onUseFocus(pick.slot, pick.targets);
              setFocusPick(null);
            }}
          />
          <PixelButton tone="orange" className="fight__menu" onClick={onExit}>
            Меню
          </PixelButton>
          <ActionBar round={round} myTurn={myTurn} onAct={onFightAction} />
        </aside>
        <section className="fight__board">
          <EnemyHand cards={round.hands.enemy} revealed={fight.reveal.enemyHand} />
          <TableView table={round.table} attacker={round.attacker}>
            {playback.board && <ScoreBoard board={playback.board} />}
          </TableView>
          <p className="sr-only" role="status">
            {error ?? statusText(fight)}
          </p>
          <PlayerHand round={round} myTurn={myTurn} shakeKey={errorSeq} sort={settings.sort} onPlay={play} targeting={targeting} />
          <DeckView round={round} revealTop={revealsTopCard(fight.jokers.player)} peek={fight.reveal.topCards} />
        </section>
      </main>
      <FightOverlay state={fight} onNextRound={() => onFightAction({ type: 'nextRound' })} onLeaveFight={onLeaveFight} />
      <ScorePops playback={playback} />
    </LayoutGroup>
  );
}

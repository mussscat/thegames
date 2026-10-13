import type { Card } from '@game/core';
import {
  applyFocus,
  currentActor,
  FOCUSES,
  focusReady,
  previewTake,
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
import { ActionBar, type FocusAction } from './ActionBar';
import { DeckView } from './DeckView';
import { EnemyHand, PlayerHand } from './FightHands';
import { FightOverlay } from './FightOverlay';
import { FightStats } from './FightStats';
import { FocusBar, type FocusPick } from './FocusBar';
import { chargeChips, playLabel, toggleTarget } from './focusView';
import { Icon } from '../../ui/Icon';
import { firingJoker } from './firingJoker';
import { JokerSheet } from './JokerSheet';
import { JokerStack } from './JokerStack';
import { EnemyBadge } from './EnemyBadge';
import { EnemyBlock } from './EnemyBlock';
import { ScoreBoard } from './ScoreBoard';
import { ScoreCounter } from './ScoreCounter';
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
  readonly onMoveJoker: (from: number, to: number) => void;
};

export function DurakFightScreen({ fight, error, errorSeq, run, scoring, onScoringDone, onFightAction, onLeaveFight, onExit, onUseFocus, onMoveJoker }: DurakFightScreenProps) {
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
  // The scoring show needs the stack on screen: it closes the sheet.
  useEffect(() => {
    if (playback.active) setSheetOpen(false);
  }, [playback.active]);
  useEffect(() => setFocusPick(null), [fight.roundNumber]);
  const pickedId = focusPick ? focuses[focusPick.slot] : undefined;
  const targeting =
    focusPick && pickedId && FOCUSES[pickedId].maxTargets > 0
      ? { picked: focusPick.targets, onPick: (card: Card) => setFocusPick({ ...focusPick, targets: toggleTarget(focusPick.targets, card.id, FOCUSES[pickedId].maxTargets) }) }
      : null;
  const focusAction: FocusAction | null =
    focusPick && pickedId
      ? {
          label: playLabel(pickedId, focusPick.targets.length),
          ready: myTurn && focusReady(fight, pickedId) && applyFocus(fight, pickedId, focusPick.targets).ok,
          onPlay: () => {
            onUseFocus(focusPick.slot, focusPick.targets);
            setFocusPick(null);
          },
          onCancel: () => setFocusPick(null),
        }
      : null;
  const play = (card: Card, use?: EnhancementSource): void => {
    const base = defending ? { type: 'defend' as const, cardId: card.id } : { type: 'attack' as const, cardId: card.id };
    onFightAction(use ? { ...base, use } : base);
  };

  return (
    <LayoutGroup>
      <main className="screen fight">
        <div className="fight__side">
          <div className="fight__top">
            <PixelButton tone="orange" className="fight__menu" onClick={onExit}>
              Меню
            </PixelButton>
            <FightStats coins={run.coins} roundNumber={fight.roundNumber} />
          </div>
          <EnemyBlock run={run}>
            <HpBar
              label="Соперник"
              lead={<EnemyBadge run={run} />}
              className="hp--enemy"
              hp={fight.hp.enemy}
              maxHp={fight.maxHp.enemy}
              shakeKey={fight.hits.some((h) => h.target === 'enemy') ? fight.hitSeq : 0}
              scoreTarget="enemy"
            />
          </EnemyBlock>
          <ScoreCounter preview={previewTake(fight)} tableHasCards={round.table.length > 0} />
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
        </div>
        <div className="fight__board">
          <EnemyHand cards={round.hands.enemy} revealed={fight.reveal.enemyHand} />
          <div className="fight__mid">
            <DeckView round={round} revealTop={revealsTopCard(fight.jokers.player)} peek={fight.reveal.topCards} />
            <TableView table={round.table} attacker={round.attacker}>
              {playback.board && <ScoreBoard board={playback.board} />}
            </TableView>
            <div className="fight__side-stack">
              <JokerStack
                jokers={fight.jokers.player}
                state={fight.jokerState.player}
                enemyTakes={fight.fightTakes.enemy}
                firing={firingJoker(playback.current)}
                disabled={playback.active}
                onOpen={() => setSheetOpen(true)}
              />
              </div>
          </div>
          <PlayerHand round={round} myTurn={myTurn} shakeKey={errorSeq} sort={settings.sort} onPlay={play} targeting={targeting} />
          <ActionBar round={round} myTurn={myTurn} onAct={onFightAction} focus={focusAction} chips={<FocusBar focuses={focuses} pick={focusPick} onPick={setFocusPick} />} />
        </div>
        <p className="sr-only" role="status">
          {error ?? statusText(fight)}
        </p>
        {sheetOpen && (
          <JokerSheet
            jokers={fight.jokers.player}
            state={fight.jokerState.player}
            enemyTakes={fight.fightTakes.enemy}
            onMove={onMoveJoker}
            onClose={() => setSheetOpen(false)}
          />
        )}
      </main>
      <FightOverlay state={fight} onNextRound={() => onFightAction({ type: 'nextRound' })} onLeaveFight={onLeaveFight} />
      <ScorePops playback={playback} />
    </LayoutGroup>
  );
}

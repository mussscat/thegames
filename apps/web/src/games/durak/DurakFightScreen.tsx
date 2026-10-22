import { previewTake, revealsTopCard, type FightAction, type FightState, type RunState, type ScoredHit } from '@game/durak';
import { LayoutGroup } from 'motion/react';
import { HpBar } from '../../components/HpBar';
import { PixelButton } from '../../ui/PixelButton';
import { ActionBar } from './ActionBar';
import { DeckView } from './DeckView';
import { EnemyHand, PlayerHand } from './FightHands';
import { FightOverlay } from './FightOverlay';
import { FightStats } from './FightStats';
import { FocusBar } from './FocusBar';
import { chargeChips } from './focusView';
import { Icon } from '../../ui/Icon';
import { firingJoker } from './firingJoker';
import { JokerSheet } from './JokerSheet';
import { JokerStack } from './JokerStack';
import { EnemyBadge } from './EnemyBadge';
import { EnemyBlock } from './EnemyBlock';
import { ScoreBoard } from './ScoreBoard';
import { ScoreCounter } from './ScoreCounter';
import { ScorePops } from './ScorePops';
import { statusText } from './status';
import { TableView } from './TableView';
import { useFightView } from './useFightView';
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
  const { settings, round, playback, myTurn, focuses, focusPick, setFocusPick, sheetOpen, setSheetOpen, targeting, focusAction, play, handStrikes, tableStrikes } = useFightView({
    fight,
    errorSeq,
    run,
    scoring,
    onScoringDone,
    onFightAction,
    onUseFocus,
  });

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
            <TableView table={round.table} attacker={round.attacker} strikeOf={tableStrikes}>
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
          <PlayerHand round={round} myTurn={myTurn} shakeKey={errorSeq} sort={settings.sort} onPlay={play} targeting={targeting} strikeOf={handStrikes} />
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

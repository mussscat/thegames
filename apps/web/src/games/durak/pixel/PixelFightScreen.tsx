import { FOCUSES, focusReady, previewTake, revealsTopCard, type FightState } from '@game/durak';
import type { Board } from '../scoreTimeline';
import { LayoutGroup } from 'motion/react';
import { PixelIcon } from '../../../components/pixel/PixelIcon';
import { ActionBar } from '../ActionBar';
import { EnemyHand, PlayerHand } from '../FightHands';
import { FightOverlay } from '../FightOverlay';
import { FocusSheet } from '../FocusSheet';
import { FocusStack } from '../FocusStack';
import { JokerSheet } from '../JokerSheet';
import { JokerStack } from '../JokerStack';
import { IDLE_BOARD, ScoreBoard } from '../ScoreBoard';
import { ScorePops } from '../ScorePops';
import { TableView } from '../TableView';
import { firingJoker } from '../firingJoker';
import { statusText } from '../status';
import type { FightViewInput } from '../useFightView';
import { useFightView } from '../useFightView';
import { CardSizeContext } from '../../../ui/CardSizeContext';
import { SharedLayoutContext } from '../../../ui/SharedLayoutContext';
import { PixelDeckView } from './PixelDeckView';
import { PixelEnemyBadge } from './PixelEnemyBadge';
import { PixelHpRow } from './PixelHpRow';
import { PixelStats } from './PixelStats';
import '../fight.css';
import '../score.css';
import './pixelFight.css';

/** Between shows the board follows the table: what taking it right now would score. */
function liveBoard(fight: FightState): Board {
  const preview = previewTake(fight);
  return preview ? { chips: preview.chips, mult: preview.mult, damage: preview.damage } : IDLE_BOARD;
}

type PixelFightScreenProps = FightViewInput & {
  readonly error: string | null;
  readonly onLeaveFight: () => void;
  readonly onExit: () => void;
  readonly onMoveJoker: (from: number, to: number) => void;
};

/**
 * The fight on the pixel stage: portrait is one column, landscape (container aspect ≥ 5:4) a sidebar beside the board. Built block by block: the top, the HP rows and the badge are on the kit;
 * the hands, the table, the deck and the action row still use the old pieces until their turn.
 */
export function PixelFightScreen({ error, onLeaveFight, onExit, onMoveJoker, ...input }: PixelFightScreenProps) {
  const { fight, run, onFightAction, onUseFocus, errorSeq } = input;
  const { settings, round, playback, myTurn, focuses, focusPick, setFocusPick, sheetOpen, setSheetOpen, focusSheetOpen, setFocusSheetOpen, targeting, focusAction, play, handStrikes, tableStrikes } = useFightView(input, { replay: false });
  const hit = (target: 'enemy' | 'player'): number => (fight.hits.some((h) => h.target === target) ? fight.hitSeq : 0);
  return (
    <LayoutGroup>
      <SharedLayoutContext.Provider value={false}>
      <main className="pfight" data-testid="pixel-fight">
        <div className="pfight__side">
          <PixelStats coins={run.coins} roundNumber={fight.roundNumber} onExit={onExit} />
          <PixelHpRow label="Соперник" hp={fight.hp.enemy} maxHp={fight.maxHp.enemy} shakeKey={hit('enemy')} scoreTarget="enemy" lead={<PixelEnemyBadge run={run} />} />
          <PixelHpRow label="Ты" hp={fight.hp.player} maxHp={fight.maxHp.player} shakeKey={hit('player')} scoreTarget="player" lead={<PixelIcon name="heart" />} />
          <ActionBar round={round} myTurn={myTurn} onAct={onFightAction} focus={focusAction} />
        </div>
        <div className="pfight__board">
          <EnemyHand cards={round.hands.enemy} revealed={fight.reveal.enemyHand} />
          <CardSizeContext.Provider value="s">
            <div className="fight__mid">
              <PixelDeckView round={round} revealTop={revealsTopCard(fight.jokers.player)} peek={fight.reveal.topCards} />
              <TableView table={round.table} attacker={round.attacker} frame="table--panel" strikeOf={tableStrikes}>
                <ScoreBoard board={playback.board ?? liveBoard(fight)} persistent />
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
                <FocusStack focuses={focuses} pickedSlot={focusPick?.slot ?? null} onOpen={() => setFocusSheetOpen(true)} />
              </div>
            </div>
          </CardSizeContext.Provider>
          <PlayerHand round={round} myTurn={myTurn} shakeKey={errorSeq} sort={settings.sort} onPlay={play} targeting={targeting} strikeOf={handStrikes} />
        </div>
        <p className="sr-only" role="status">
          {error ?? statusText(fight)}
        </p>
        {sheetOpen && (
          <JokerSheet jokers={fight.jokers.player} state={fight.jokerState.player} enemyTakes={fight.fightTakes.enemy} onMove={onMoveJoker} onClose={() => setSheetOpen(false)} />
        )}
        {focusSheetOpen && (
          <FocusSheet
            focuses={focuses}
            pickedSlot={focusPick?.slot ?? null}
            usable={(slot) => {
              const id = focuses[slot];
              return myTurn && id !== undefined && focusReady(fight, id);
            }}
            onPlay={(slot) => {
              const id = focuses[slot];
              if (id === undefined) return;
              if (FOCUSES[id].maxTargets === 0) onUseFocus(slot, []);
              else setFocusPick({ slot, targets: [] });
            }}
            onClose={() => setFocusSheetOpen(false)}
          />
        )}
      </main>
      </SharedLayoutContext.Provider>
      <FightOverlay state={fight} onNextRound={() => onFightAction({ type: 'nextRound' })} onLeaveFight={onLeaveFight} />
      <ScorePops playback={playback} />
    </LayoutGroup>
  );
}

import { revealsTopCard } from '@game/durak';
import { LayoutGroup } from 'motion/react';
import { PixelIcon } from '../../../components/pixel/PixelIcon';
import { ActionBar } from '../ActionBar';
import { EnemyHand, PlayerHand } from '../FightHands';
import { FightOverlay } from '../FightOverlay';
import { FocusBar } from '../FocusBar';
import { JokerSheet } from '../JokerSheet';
import { JokerStack } from '../JokerStack';
import { ScoreBoard } from '../ScoreBoard';
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

type PixelFightScreenProps = FightViewInput & {
  readonly error: string | null;
  readonly onLeaveFight: () => void;
  readonly onExit: () => void;
  readonly onMoveJoker: (from: number, to: number) => void;
};

/**
 * The fight on the pixel stage (portrait). Built block by block: the top, the HP rows and the badge are on the kit;
 * the hands, the table, the deck and the action row still use the old pieces until their turn.
 */
export function PixelFightScreen({ error, onLeaveFight, onExit, onMoveJoker, ...input }: PixelFightScreenProps) {
  const { fight, run, onFightAction, errorSeq } = input;
  const { settings, round, playback, myTurn, focuses, focusPick, setFocusPick, sheetOpen, setSheetOpen, targeting, focusAction, play } = useFightView(input);
  const hit = (target: 'enemy' | 'player'): number => (fight.hits.some((h) => h.target === target) ? fight.hitSeq : 0);
  return (
    <LayoutGroup>
      <SharedLayoutContext.Provider value={false}>
      <main className="pfight" data-testid="pixel-fight">
        <PixelStats coins={run.coins} roundNumber={fight.roundNumber} onExit={onExit} />
        <PixelHpRow label="Соперник" hp={fight.hp.enemy} maxHp={fight.maxHp.enemy} shakeKey={hit('enemy')} scoreTarget="enemy" lead={<PixelEnemyBadge run={run} />} />
        <EnemyHand cards={round.hands.enemy} revealed={fight.reveal.enemyHand} />
        <CardSizeContext.Provider value="s">
          <div className="fight__mid">
            <PixelDeckView round={round} revealTop={revealsTopCard(fight.jokers.player)} peek={fight.reveal.topCards} />
            <TableView table={round.table} attacker={round.attacker} frame="table--panel">
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
        </CardSizeContext.Provider>
        <PlayerHand round={round} myTurn={myTurn} shakeKey={errorSeq} sort={settings.sort} onPlay={play} targeting={targeting} />
        <PixelHpRow label="Ты" hp={fight.hp.player} maxHp={fight.maxHp.player} shakeKey={hit('player')} scoreTarget="player" lead={<PixelIcon name="heart" />} />
        <ActionBar round={round} myTurn={myTurn} onAct={onFightAction} focus={focusAction} chips={<FocusBar focuses={focuses} pick={focusPick} onPick={setFocusPick} />} />
        <p className="sr-only" role="status">
          {error ?? statusText(fight)}
        </p>
        {sheetOpen && (
          <JokerSheet jokers={fight.jokers.player} state={fight.jokerState.player} enemyTakes={fight.fightTakes.enemy} onMove={onMoveJoker} onClose={() => setSheetOpen(false)} />
        )}
      </main>
      </SharedLayoutContext.Provider>
      <FightOverlay state={fight} onNextRound={() => onFightAction({ type: 'nextRound' })} onLeaveFight={onLeaveFight} />
      <ScorePops playback={playback} />
    </LayoutGroup>
  );
}

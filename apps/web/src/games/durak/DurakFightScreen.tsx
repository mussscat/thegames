import type { Card } from '@game/core';
import {
  cardEnhancements,
  currentActor,
  isTrumpCard,
  legalActions,
  revealsTopCard,
  type EnhancementSource,
  type FightAction,
  type FightState,
} from '@game/durak';
import { LayoutGroup } from 'motion/react';
import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { CardBack, CardView } from '../../components/CardView';
import { HpBar } from '../../components/HpBar';
import { fanAngle, fanDrop, handOverlap } from '../../ui/fan';
import { PixelButton } from '../../ui/PixelButton';
import { useSettings } from '../../ui/SettingsContext';
import { usePrevious } from '../../ui/usePrevious';
import { ActionBar } from './ActionBar';
import { DeckView } from './DeckView';
import { FightOverlay } from './FightOverlay';
import { hitLabelFor } from './hits';
import { fightSound } from './sounds';
import { statusText } from './status';
import { TableView } from './TableView';
import './fight.css';

/** Card widths a hand may take: leaves room for the fan's rotation at the screen edges. */
const HAND_FIT = 6;

/** Later cards sit on top; a big hand overlaps so it never leaves the screen. */
function slotStyle(index: number, count: number, fan: boolean): CSSProperties {
  const overlap = handOverlap(count, HAND_FIT);
  return {
    marginLeft: index === 0 ? 0 : `calc(var(--slot-w) * ${-overlap})`,
    transform: fan ? `translateY(${fanDrop(index, count)}px) rotate(${fanAngle(index, count)}deg)` : undefined,
    zIndex: index,
  };
}

type DurakFightScreenProps = {
  readonly fight: FightState;
  readonly error: string | null;
  readonly errorSeq: number;
  readonly header: ReactNode;
  readonly onFightAction: (action: FightAction) => void;
  readonly onLeaveFight: () => void;
  readonly onExit: () => void;
};

export function DurakFightScreen({ fight, error, errorSeq, header, onFightAction, onLeaveFight, onExit }: DurakFightScreenProps) {
  const { settings, play: playSfx } = useSettings();
  const { round } = fight;
  const previous = usePrevious(fight);
  useEffect(() => {
    if (!previous || previous === fight) return;
    const sound = fightSound(previous, fight);
    if (sound) playSfx(sound);
  }, [fight, previous, playSfx]);
  useEffect(() => {
    if (errorSeq > 0) playSfx('deny');
  }, [errorSeq, playSfx]);
  const myTurn = !fight.winner && currentActor(round) === 'player';
  const defending = myTurn && round.attacker === 'enemy';
  const legal = legalActions(round, 'player');
  const playableIds = new Set(legal.flatMap((action) => ('cardId' in action ? [action.cardId] : [])));
  const legalUses = (cardId: string): readonly EnhancementSource[] =>
    legal.flatMap((action) => ('cardId' in action && action.cardId === cardId && action.use ? [action.use] : []));

  const play = (card: Card, use?: EnhancementSource): void => {
    const base = defending ? { type: 'defend' as const, cardId: card.id } : { type: 'attack' as const, cardId: card.id };
    onFightAction(use ? { ...base, use } : base);
  };

  return (
    <LayoutGroup>
      <main className="screen fight">
        <header className="fight__header">
          <PixelButton tone="blue" small onClick={onExit}>
            Меню
          </PixelButton>
          <span className="chip">Раздача {fight.roundNumber}</span>
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
          {round.hands.enemy.map((card, index, all) => (
            <div key={card.id} className="hand__slot" style={slotStyle(index, all.length, false)}>
              <CardBack layoutId={card.id} />
            </div>
          ))}
        </div>

        <div className="fight__middle">
          <DeckView round={round} revealTop={revealsTopCard(fight.perks)} />
          <TableView table={round.table} attacker={round.attacker} />
        </div>

        <p className="fight__status panel" role="status">
          {error ?? statusText(fight)}
        </p>
        <ActionBar round={round} myTurn={myTurn} onAct={onFightAction} />

        <div className={myTurn ? 'hand hand--player' : 'hand hand--player hand--waiting'} data-testid="player-hand">
          {round.hands.player.map((card, index, all) => {
            const enhancements = cardEnhancements(round, 'player', card);
            const split = Boolean(enhancements.own && enhancements.foreign);
            return (
              <div key={card.id} className="hand__slot" style={slotStyle(index, all.length, true)}>
                <CardView
                  card={card}
                  enhancements={enhancements}
                  playable={myTurn && playableIds.has(card.id)}
                  trump={isTrumpCard(card, round.trumpSuit, round.boss) || enhancements.own === 'trump' || enhancements.foreign === 'trump'}
                  onTap={myTurn && !split ? () => play(card) : undefined}
                  onTapOption={myTurn && split ? (use) => play(card, use) : undefined}
                  legalUses={myTurn && split ? legalUses(card.id) : undefined}
                  idle={settings.sway}
                  swayDelay={index * 0.4}
                />
              </div>
            );
          })}
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

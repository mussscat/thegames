import { motion } from 'motion/react';
import type { FightState, RoundOutcome } from '@game/durak';
import { PixelButton } from '../../ui/PixelButton';

const PANEL_POP = {
  initial: { scale: 0.6, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: 'spring', stiffness: 400, damping: 18 },
} as const;

type FightOverlayProps = {
  readonly state: FightState;
  readonly onNextRound: () => void;
  readonly onLeaveFight: () => void;
};

function roundTitle(outcome: RoundOutcome): string {
  if (outcome.loser === null) return 'Ничья';
  return outcome.loser === 'player' ? 'Ты остался в дураках' : 'Соперник в дураках';
}

function roundDetails(outcome: RoundOutcome): string {
  if (outcome.loser === null) return 'Оба вышли одновременно';
  return outcome.loser === 'player'
    ? `У тебя осталось карт: ${outcome.cardsLeft}`
    : `У соперника осталось карт: ${outcome.cardsLeft}`;
}

export function FightOverlay({ state, onNextRound, onLeaveFight }: FightOverlayProps) {
  if (state.winner) {
    const won = state.winner === 'player';
    return (
      <div className="overlay" role="dialog" aria-modal="true">
        <motion.div className="overlay__panel panel" {...PANEL_POP}>
          <h2 className="overlay__title">{won ? 'Победа!' : 'Поражение'}</h2>
          <p>Раздач сыграно: {state.roundNumber}</p>
          <PixelButton tone={won ? 'green' : 'blue'} onClick={onLeaveFight}>
            {won ? 'Забрать награду' : 'К итогам'}
          </PixelButton>
        </motion.div>
      </div>
    );
  }
  const outcome = state.round.outcome;
  if (!outcome) return null;
  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <motion.div className="overlay__panel panel" {...PANEL_POP}>
        <h2 className="overlay__title">{roundTitle(outcome)}</h2>
        <p>{roundDetails(outcome)}</p>
        <PixelButton tone="green" onClick={onNextRound}>
          Следующая раздача
        </PixelButton>
      </motion.div>
    </div>
  );
}

import type { FightState, RoundOutcome } from '@game/durak';

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
        <div className="overlay__panel">
          <h2>{won ? 'Победа!' : 'Поражение'}</h2>
          <p>Раздач сыграно: {state.roundNumber}</p>
          <button type="button" className="btn btn--primary" onClick={onLeaveFight}>
            {won ? 'Забрать награду' : 'К итогам'}
          </button>
        </div>
      </div>
    );
  }
  const outcome = state.round.outcome;
  if (!outcome) return null;
  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="overlay__panel">
        <h2>{roundTitle(outcome)}</h2>
        <p>{roundDetails(outcome)}</p>
        <button type="button" className="btn btn--primary" onClick={onNextRound}>
          Следующая раздача
        </button>
      </div>
    </div>
  );
}

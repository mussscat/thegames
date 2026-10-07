import type { FightState, RoundOutcome } from '@game/durak';

type FightOverlayProps = {
  readonly state: FightState;
  readonly onNextRound: () => void;
  readonly onRestart: () => void;
  readonly onExit: () => void;
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

export function FightOverlay({ state, onNextRound, onRestart, onExit }: FightOverlayProps) {
  if (state.winner) {
    return (
      <div className="overlay" role="dialog" aria-modal="true">
        <div className="overlay__panel">
          <h2>{state.winner === 'player' ? 'Победа!' : 'Поражение'}</h2>
          <p>Раздач сыграно: {state.roundNumber}</p>
          <button type="button" className="btn btn--primary" onClick={onRestart}>
            Ещё бой
          </button>
          <button type="button" className="btn" onClick={onExit}>
            В меню
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

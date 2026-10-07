import { PERKS, RUN_SCHEDULE, type RunState } from '@game/durak';

type RunOverScreenProps = {
  readonly run: RunState;
  readonly won: boolean;
  readonly onNewRun: () => void;
  readonly onExit: () => void;
};

export function RunOverScreen({ run, won, onNewRun, onExit }: RunOverScreenProps) {
  const fightsWon = won ? RUN_SCHEDULE.length : run.stage;
  return (
    <main className="screen menu" data-testid="run-over">
      <h1 className="menu__title">{won ? 'Забег пройден!' : 'Забег окончен'}</h1>
      <p className="menu__subtitle">
        Боёв выиграно: {fightsWon} из {RUN_SCHEDULE.length} · Монеты: {run.coins}
      </p>
      <p className="menu__rules">
        Перки: {run.perks.length > 0 ? run.perks.map((id) => PERKS[id].name).join(', ') : '—'}
      </p>
      <button type="button" className="btn btn--primary" onClick={onNewRun}>
        Новый забег
      </button>
      <button type="button" className="btn" onClick={onExit}>
        В меню
      </button>
    </main>
  );
}

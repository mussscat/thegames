import { PERKS, RUN_SCHEDULE, type RunState } from '@game/durak';
import '../../screens/menu.css';
import { PixelButton } from '../../ui/PixelButton';

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
      <section className="panel run-over">
        <p>
          Боёв выиграно: {fightsWon} из {RUN_SCHEDULE.length}
        </p>
        <p>Монеты: {run.coins}</p>
        <p>Перки: {run.perks.length > 0 ? run.perks.map((id) => PERKS[id].name).join(', ') : '—'}</p>
      </section>
      <div className="menu__buttons">
        <PixelButton tone="green" onClick={onNewRun}>
          Новый забег
        </PixelButton>
        <PixelButton tone="blue" onClick={onExit}>
          В меню
        </PixelButton>
      </div>
    </main>
  );
}

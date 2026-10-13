import type { TakePreview } from '@game/durak';
import { counterView } from './counterText';
import './scoreCounter.css';

/**
 * Balatro's «chips × mult» counter (owner, 2026-10-13): it follows the cards on the table and shows the hit the
 * taker would suffer if the table were taken now. Shown in the side panel only; portrait phones do not have it.
 */
export function ScoreCounter({ preview }: { readonly preview: TakePreview | null }) {
  const view = counterView(preview);
  return (
    <section className={`counter counter--${view.taker ?? 'none'}`} data-testid="score-counter" aria-label="Подсчёт удара">
      <p className="counter__label">{view.label || 'Стол пуст'}</p>
      <div className="counter__row">
        <span className="counter__chips" data-testid="counter-chips" aria-label="Фишки">
          {view.chips}
        </span>
        <span className="counter__times" aria-hidden="true">
          ×
        </span>
        <span className="counter__mult" data-testid="counter-mult" aria-label="Множитель">
          {view.mult}
        </span>
      </div>
      <p className="counter__damage" data-testid="counter-damage">
        = {view.damage}
      </p>
    </section>
  );
}

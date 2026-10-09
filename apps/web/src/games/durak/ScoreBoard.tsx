import { formatMult } from './hits';
import type { Board } from './scoreTimeline';

/** Balatro-style board over the table: blue chips × red mult, and «= damage» on the final. */
export function ScoreBoard({ board }: { readonly board: Board }) {
  return (
    <div className="score-board" data-testid="score-board" data-score-board aria-live="polite">
      <span className="score-board__cell score-board__cell--chips">
        <span className="score-board__caption">Фишки</span>
        {formatMult(board.chips)}
      </span>
      <span className="score-board__times">×</span>
      <span className="score-board__cell score-board__cell--mult">
        <span className="score-board__caption">Множитель</span>
        {formatMult(board.mult)}
      </span>
      {board.damage !== null && <span className="score-board__damage">= {board.damage}</span>}
    </div>
  );
}

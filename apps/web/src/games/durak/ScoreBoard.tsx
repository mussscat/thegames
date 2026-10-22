import { Icon } from '../../ui/Icon';
import { formatMult } from './hits';
import type { Board } from './scoreTimeline';

/** The board before the first step of a show (and between shows in persistent mode). */
export const IDLE_BOARD: Board = { chips: 0, mult: 1, damage: null };

const LIVE_EPSILON = 1e-9;

/** The hit so far: the final damage once known, otherwise what chips × mult would deal right now. */
const liveDamage = (board: Board): number => board.damage ?? Math.max(0, Math.floor(board.chips * board.mult + LIVE_EPSILON));

type ScoreBoardProps = {
  readonly board: Board;
  /** Always on screen: icons only, no fade-in, and the numbers bump on every change. */
  readonly persistent?: boolean;
};

/** Balatro-style board over the table: blue chips × red mult, and «= damage» on the final. */
export function ScoreBoard({ board, persistent = false }: ScoreBoardProps) {
  const className = persistent ? 'score-board score-board--persistent' : 'score-board';
  return (
    <div className={className} data-testid="score-board" data-score-board aria-live="polite">
      <span className="score-board__cell score-board__cell--chips">
        <span className="score-board__caption" aria-label={persistent ? 'Фишки' : undefined}>
          <Icon id="chip" />
          {!persistent && ' Фишки'}
        </span>
        <span key={board.chips} className="score-board__value">{formatMult(board.chips)}</span>
      </span>
      <span className="score-board__times">×</span>
      <span className="score-board__cell score-board__cell--mult">
        <span className="score-board__caption" aria-label={persistent ? 'Множитель' : undefined}>
          <Icon id="mult" />
          {!persistent && ' Множитель'}
        </span>
        <span key={board.mult} className="score-board__value">{formatMult(board.mult)}</span>
      </span>
      {persistent ? (
        <span className="score-board__cell score-board__cell--damage" aria-label="Урон">
          <span className="score-board__eq">=</span>
          <span key={liveDamage(board)} className="score-board__value">{liveDamage(board)}</span>
        </span>
      ) : (
        board.damage !== null && <span className="score-board__damage">= {board.damage}</span>
      )}
    </div>
  );
}

import type { PlayerId, TablePair } from '@game/durak';
import type { ReactNode } from 'react';
import { CardView } from '../../components/CardView';

type TableViewProps = {
  readonly table: readonly TablePair[];
  readonly attacker: PlayerId;
  /** Overlays drawn over the table (the scoring board). */
  readonly children?: ReactNode;
};

/** Badges show who played the enhancement: blue — the player, red — the enemy. */
function badge(enhancement: TablePair['attackEnh'], playedByPlayer: boolean) {
  if (!enhancement) return undefined;
  return playedByPlayer ? { own: enhancement } : { foreign: enhancement };
}

export function TableView({ table, attacker, children }: TableViewProps) {
  const playerAttacks = attacker === 'player';
  return (
    <div className="table panel" data-testid="table">
      {table.map((pair) => (
        <div key={pair.attack.id} className="table__pair" data-score-card={pair.attack.id}>
          <CardView card={pair.attack} enhancements={badge(pair.attackEnh, playerAttacks)} />
          {pair.defense && (
            <div className="table__defense">
              <CardView card={pair.defense} enhancements={badge(pair.defenseEnh, !playerAttacks)} />
            </div>
          )}
        </div>
      ))}
      {children}
    </div>
  );
}

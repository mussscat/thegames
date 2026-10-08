import type { PlayerId, TablePair } from '@game/durak';
import { CardView } from '../../components/CardView';

type TableViewProps = { readonly table: readonly TablePair[]; readonly attacker: PlayerId };

/** Badges show who played the enhancement: blue — the player, red — the enemy. */
function badge(enhancement: TablePair['attackEnh'], playedByPlayer: boolean) {
  if (!enhancement) return undefined;
  return playedByPlayer ? { own: enhancement } : { foreign: enhancement };
}

export function TableView({ table, attacker }: TableViewProps) {
  const playerAttacks = attacker === 'player';
  return (
    <div className="table" data-testid="table">
      {table.map((pair) => (
        <div key={pair.attack.id} className="table__pair">
          <CardView card={pair.attack} enhancements={badge(pair.attackEnh, playerAttacks)} />
          {pair.defense && (
            <div className="table__defense">
              <CardView card={pair.defense} enhancements={badge(pair.defenseEnh, !playerAttacks)} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

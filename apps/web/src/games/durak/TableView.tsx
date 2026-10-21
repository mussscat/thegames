import type { PlayerId, TablePair } from '@game/durak';
import type { ReactNode } from 'react';
import { CardView } from '../../components/CardView';
import { useSharedLayout } from '../../ui/SharedLayoutContext';
import { useMotionEnabled } from '../../ui/useMotion';
import { TableSlot } from './TableSlot';
import { defenderOf, entryFrom } from './tableEntry';

type TableViewProps = {
  readonly table: readonly TablePair[];
  readonly attacker: PlayerId;
  /** Overlays drawn over the table (the scoring board). */
  readonly children?: ReactNode;
  /** The frame class around the pairs: the old panel by default, a kit plate on the pixel stage. */
  readonly frame?: string;
};

/** Badges show who played the enhancement: blue — the player, red — the enemy. */
function badge(enhancement: TablePair['attackEnh'], playedByPlayer: boolean) {
  if (!enhancement) return undefined;
  return playedByPlayer ? { own: enhancement } : { foreign: enhancement };
}

export function TableView({ table, attacker, children, frame = 'panel' }: TableViewProps) {
  const playerAttacks = attacker === 'player';
  // Without shared layout (the pixel stage) a card cannot morph from the hand, so it flies in on its own.
  const fly = !useSharedLayout() && useMotionEnabled();
  const fallbackY = (who: PlayerId): number => entryFrom(who).y;
  return (
    <div className={`table ${frame}`} data-testid="table">
      {table.map((pair) => (
        <TableSlot key={pair.attack.id} cardId={pair.attack.id} className="table__pair" data-score-card={pair.attack.id} fly={fly} leaves fallbackY={fallbackY(attacker)}>
          <CardView card={pair.attack} enhancements={badge(pair.attackEnh, playerAttacks)} />
          {pair.defense && (
            <TableSlot cardId={pair.defense.id} className="table__defense" fly={fly} fallbackY={fallbackY(defenderOf(attacker))}>
              <CardView card={pair.defense} enhancements={badge(pair.defenseEnh, !playerAttacks)} />
            </TableSlot>
          )}
        </TableSlot>
      ))}
      {children}
    </div>
  );
}

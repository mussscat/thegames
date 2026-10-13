import { stageEnemy, type RunState } from '@game/durak';
import type { ReactNode } from 'react';
import { enemyLine } from './enemyTip';

/**
 * The enemy in the side panel, as Balatro's blind block (owner, 2026-10-13): a tier-coloured title with its name, then its
 * portrait and HP (`children`: the HP bar with the badge, later an animated miniature) and a short line about it.
 * On portrait phones the wrapper and the title/line do not exist visually: only the HP bar with the badge shows.
 */
export function EnemyBlock({ run, children }: { readonly run: RunState; readonly children: ReactNode }) {
  const enemy = stageEnemy(run, run.stage);
  const line = enemyLine(enemy);
  return (
    <div className={`enemy-block enemy-block--${enemy.tier}`}>
      <h2 className="enemy-title">{enemy.name}</h2>
      {children}
      <p className="enemy-line">
        <span>{line.kind}</span>
        {line.rule && <span className="enemy-line__rule">{line.rule}</span>}
      </p>
    </div>
  );
}

import { stageEnemy, type RunState } from '@game/durak';
import { CardTip, useCardTip } from '../../components/CardTip';
import { Icon } from '../../ui/Icon';
import { enemyTipLines } from './enemyTip';

const TIER_ICONS = { normal: 'skull', strong: 'skullStrong', boss: 'skullBoss' } as const;

/**
 * The enemy as one button at the start of its HP bar (owner, 2026-10-12): the tip tells everything.
 * It carries the score anchors the old banner had, so the enemy's multiplier and jokers still pop here.
 */
export function EnemyBadge({ run }: { readonly run: RunState }) {
  const enemy = stageEnemy(run, run.stage);
  const { anchor, handlers } = useCardTip(true, true);
  return (
    <span className="enemy-badge-wrap">
      <button
        type="button"
        className={`enemy-badge enemy-badge--${enemy.tier}`}
        aria-label={`Соперник: ${enemy.name}`}
        aria-expanded={anchor !== null}
        data-testid="enemy-badge"
        {...handlers}
      >
        <Icon id={TIER_ICONS[enemy.tier]} />
        <span data-score-tier aria-hidden="true" className="enemy-badge__anchor" />
        {enemy.jokers.map((id, i) => (
          <span key={id} data-score-joker={`enemy-${i}`} aria-hidden="true" className="enemy-badge__anchor" />
        ))}
      </button>
      {anchor && <CardTip anchor={anchor} lines={enemyTipLines(enemy)} />}
    </span>
  );
}

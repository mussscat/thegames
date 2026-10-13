import { stageEnemy, type RunState } from '@game/durak';
import { CardTip, useCardTip } from '../../../components/CardTip';
import { PixelIcon } from '../../../components/pixel/PixelIcon';
import { buttonClass, type ButtonTone } from '../../../components/pixel/classes';
import { enemyTipLines } from '../enemyTip';

const TIER_TONES: Readonly<Record<'normal' | 'strong' | 'boss', ButtonTone>> = { normal: 'blue', strong: 'orange', boss: 'red' };

/**
 * The enemy as one square kit button at the start of its HP bar: the tier is its colour, the tip tells who it is.
 * Carries the score anchors the old badge had, so the enemy's multiplier and jokers still pop here.
 */
export function PixelEnemyBadge({ run }: { readonly run: RunState }) {
  const enemy = stageEnemy(run, run.stage);
  const { anchor, handlers } = useCardTip(true, true);
  return (
    <span className="pfight__badge-wrap">
      <button
        type="button"
        className={buttonClass(TIER_TONES[enemy.tier], false, 'pfight__badge')}
        aria-label={`Соперник: ${enemy.name}`}
        aria-expanded={anchor !== null}
        data-testid="enemy-badge"
        {...handlers}
      >
        <span>
          <PixelIcon name="skull" />
        </span>
        <span data-score-tier aria-hidden="true" className="pfight__anchor" />
        {enemy.jokers.map((id, i) => (
          <span key={id} data-score-joker={`enemy-${i}`} aria-hidden="true" className="pfight__anchor" />
        ))}
      </button>
      {anchor && <CardTip anchor={anchor} lines={enemyTipLines(enemy)} />}
    </span>
  );
}

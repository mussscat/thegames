import { BOSSES, FIGHTS_PER_CIRCLE, stageEnemy, stageLabel, type RunState } from '@game/durak';

const TIER_LABELS = { normal: 'соперник', strong: 'сильный соперник', boss: 'босс' } as const;

/** The opponent banner, coloured by tier like Balatro's blind banner. */
export function RunHeader({ run }: { readonly run: RunState }) {
  const { circle, fight } = stageLabel(run.stage);
  const enemy = stageEnemy(run, run.stage);
  return (
    <div className={`run-header panel run-header--${enemy.tier}`} data-testid="run-header">
      <h2 className="run-header__name">{enemy.name}</h2>
      <span className="run-header__stage">
        Круг {circle} · бой {fight}/{FIGHTS_PER_CIRCLE} · {TIER_LABELS[enemy.tier]}
      </span>
      {enemy.boss && <span className="run-header__boss">{BOSSES[enemy.boss].description}</span>}
    </div>
  );
}

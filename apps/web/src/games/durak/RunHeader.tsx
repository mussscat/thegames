import { BOSSES, FIGHTS_PER_CIRCLE, JOKERS, stageEnemy, stageLabel, TIER_MULT, type RunState } from '@game/durak';

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
      {(enemy.jokers.length > 0 || TIER_MULT[enemy.tier] > 1) && (
        <span className="run-header__jokers">
          {TIER_MULT[enemy.tier] > 1 && <span className="chip">×{TIER_MULT[enemy.tier]}</span>}
          {enemy.jokers.map((id) => (
            <span key={id} className="chip" title={JOKERS[id].description}>
              {JOKERS[id].name}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

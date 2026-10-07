import { enemyAt, FIGHTS_PER_CIRCLE, PERKS, stageLabel, type RunState } from '@game/durak';

const TIER_LABELS = { normal: 'соперник', strong: 'сильный соперник', boss: 'босс' } as const;

export function RunHeader({ run }: { readonly run: RunState }) {
  const { circle, fight } = stageLabel(run.stage);
  const enemy = enemyAt(run.stage);
  return (
    <div className="run-header" data-testid="run-header">
      <span>
        Круг {circle} · бой {fight}/{FIGHTS_PER_CIRCLE} — {enemy.name} ({TIER_LABELS[enemy.tier]})
      </span>
      <span>
        Монеты: {run.coins} · Перки: {run.perks.length > 0 ? run.perks.map((id) => PERKS[id].name).join(', ') : '—'}
      </span>
    </div>
  );
}

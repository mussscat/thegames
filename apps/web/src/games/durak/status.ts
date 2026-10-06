import { currentActor, type FightState } from '@game/durak';

export function statusText(state: FightState): string {
  const { round } = state;
  if (state.winner) return 'Бой окончен';
  if (round.outcome) return 'Раздача окончена';
  if (currentActor(round) === 'enemy') {
    return round.defenderTaking ? 'Соперник подкидывает…' : 'Ход соперника…';
  }
  if (round.defenderTaking) return 'Соперник берёт — подкинь ещё или нажми «Готово»';
  if (round.attacker === 'enemy') return 'Отбивайся или бери';
  return round.table.length === 0 ? 'Твой ход — атакуй' : 'Подкинь или нажми «Бито»';
}

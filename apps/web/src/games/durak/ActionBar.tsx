import type { FightAction, RoundState } from '@game/durak';

type ActionBarProps = {
  readonly round: RoundState;
  readonly myTurn: boolean;
  readonly onAct: (action: FightAction) => void;
};

export function ActionBar({ round, myTurn, onAct }: ActionBarProps) {
  if (!myTurn || (round.attacker === 'player' && round.table.length === 0)) {
    return <div className="actions" />;
  }
  if (round.attacker === 'enemy') {
    return (
      <div className="actions">
        <button type="button" className="btn" onClick={() => onAct({ type: 'take' })}>
          Беру
        </button>
      </div>
    );
  }
  return (
    <div className="actions">
      <button type="button" className="btn btn--primary" onClick={() => onAct({ type: 'endAttack' })}>
        {round.defenderTaking ? 'Готово' : 'Бито'}
      </button>
    </div>
  );
}

import { PixelButton } from '../../ui/PixelButton';
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
        <PixelButton tone="blue" onClick={() => onAct({ type: 'take' })}>
          Беру
        </PixelButton>
      </div>
    );
  }
  return (
    <div className="actions">
      <PixelButton tone="red" onClick={() => onAct({ type: 'endAttack' })}>
        {round.defenderTaking ? 'Готово' : 'Бито'}
      </PixelButton>
    </div>
  );
}

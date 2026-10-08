import type { RunState } from '@game/durak';
import { DurakFightScreen } from './DurakFightScreen';
import { RunOverScreen } from './RunOverScreen';
import { ShopScreen } from './ShopScreen';
import { useDurakRun } from './useDurakRun';

type DurakRunScreenProps = {
  readonly initialRun: RunState;
  readonly onExit: () => void;
  readonly onNewRun: () => void;
};

export function DurakRunScreen({ initialRun, onExit, onNewRun }: DurakRunScreenProps) {
  const { run, error, errorSeq, act } = useDurakRun(initialRun);
  const { phase } = run;
  switch (phase.kind) {
    case 'fight':
      return (
        <DurakFightScreen
          fight={phase.fight}
          error={error}
          errorSeq={errorSeq}
          run={run}
          onFightAction={(action) => act({ type: 'fight', actor: 'player', action })}
          onLeaveFight={() => act({ type: 'leaveFight' })}
          onExit={onExit}
        />
      );
    case 'shop':
      return (
        <ShopScreen run={run} shop={phase.shop} reward={phase.reward} error={error} errorSeq={errorSeq} onAct={act} onExit={onExit} />
      );
    case 'over':
      return <RunOverScreen run={run} won={phase.won} onNewRun={onNewRun} onExit={onExit} />;
  }
}

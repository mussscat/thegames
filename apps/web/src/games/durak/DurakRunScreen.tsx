import type { RunState } from '@game/durak';
import { useStage } from '../../ui/StageContext';
import { DurakFightScreen } from './DurakFightScreen';
import { PixelFightScreen } from './pixel/PixelFightScreen';
import { RunOverScreen } from './RunOverScreen';
import { ShopScreen } from './ShopScreen';
import { useDurakRun } from './useDurakRun';

type DurakRunScreenProps = {
  readonly initialRun: RunState;
  readonly onExit: () => void;
  readonly onNewRun: () => void;
  /** Off in the sandbox: the run is not written to the save slot. */
  readonly persist?: boolean;
};

export function DurakRunScreen({ initialRun, onExit, onNewRun, persist = true }: DurakRunScreenProps) {
  const { run, error, errorSeq, scoring, finishScoring, act } = useDurakRun(initialRun, persist);
  const { phase } = run;
  const onStage = useStage().root !== null;
  switch (phase.kind) {
    case 'fight': {
      const Screen = onStage ? PixelFightScreen : DurakFightScreen;
      return (
        <Screen
          fight={phase.fight}
          error={error}
          errorSeq={errorSeq}
          run={run}
          scoring={scoring}
          onScoringDone={finishScoring}
          onFightAction={(action) => act({ type: 'fight', actor: 'player', action })}
          onLeaveFight={() => act({ type: 'leaveFight' })}
          onExit={onExit}
          onUseFocus={(slot, targets) => act({ type: 'useFocus', slot, targets })}
          onMoveJoker={(from, to) => act({ type: 'moveJoker', from, to })}
        />
      );
    }
    case 'shop':
      return (
        <ShopScreen run={run} shop={phase.shop} reward={phase.reward} error={error} errorSeq={errorSeq} onAct={act} onExit={onExit} />
      );
    case 'over':
      return <RunOverScreen run={run} won={phase.won} onNewRun={onNewRun} onExit={onExit} />;
  }
}

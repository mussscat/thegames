import { createRun, FOCUS_IDS, FOCUSES, JOKER_IDS, JOKERS, MAX_FOCUSES, MAX_JOKERS, RUN_SCHEDULE, type FocusId, type JokerId } from '@game/durak';
import { useMemo, useState } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { DurakRunScreen } from '../games/durak/DurakRunScreen';
import { randomSeed } from '../seed';
import { Backdrop } from '../ui/Backdrop';
import { PixelStage } from '../ui/PixelStage';
import { SettingsProvider } from '../ui/SettingsContext';
import { readStageFlag } from '../ui/stageFlag';
import './sandbox.css';

const SANDBOX_COINS = 50;

/** Adds `id` to the picks; at the limit the oldest pick makes room, so a click always does something. */
function toggle<T>(picks: readonly T[], id: T, limit: number): readonly T[] {
  if (picks.includes(id)) return picks.filter((p) => p !== id);
  return [...picks, id].slice(-limit);
}

type PickerProps<T extends string> = {
  readonly title: string;
  readonly ids: readonly T[];
  readonly picks: readonly T[];
  readonly label: (id: T) => string;
  readonly onToggle: (id: T) => void;
};

function Picker<T extends string>({ title, ids, picks, label, onToggle }: PickerProps<T>) {
  return (
    <fieldset className="sandbox__group">
      <legend>{title}</legend>
      {ids.map((id) => (
        <button key={id} type="button" className={picks.includes(id) ? 'sandbox__pick sandbox__pick--on' : 'sandbox__pick'} onClick={() => onToggle(id)}>
          {label(id)}
        </button>
      ))}
    </fieldset>
  );
}

/**
 * `?sandbox`: the real game with a side panel to pick which jokers and focuses the run starts with (a run holds
 * MAX_JOKERS and MAX_FOCUSES at once), the starting fight and a fresh deal. Nothing is saved.
 */
export function SandboxApp() {
  const [open, setOpen] = useState(true);
  const [jokers, setJokers] = useState<readonly JokerId[]>(() => JOKER_IDS.slice(0, MAX_JOKERS));
  const [focuses, setFocuses] = useState<readonly FocusId[]>(() => FOCUS_IDS.slice(0, MAX_FOCUSES));
  const [stage, setStage] = useState(0);
  const [seed, setSeed] = useState(randomSeed);
  const [onStage] = useState(readStageFlag);

  const run = useMemo(() => createRun(seed, { jokers, focuses, stage, coins: SANDBOX_COINS }), [seed, jokers, focuses, stage]);
  const runKey = `${seed}:${jokers.join()}:${focuses.join()}:${stage}`;
  const reset = (): void => setSeed(randomSeed());

  const game = (
    <ErrorBoundary onReset={reset}>
      <DurakRunScreen key={runKey} initialRun={run} onExit={reset} onNewRun={reset} persist={false} />
    </ErrorBoundary>
  );

  return (
    <SettingsProvider>
      <div className="rotate-lock" role="alert">Поверни телефон вертикально</div>
      {onStage ? (
        <PixelStage background={<Backdrop />}>{game}</PixelStage>
      ) : (
        <>
          <Backdrop />
          {game}
        </>
      )}
      <aside className={open ? 'sandbox' : 'sandbox sandbox--closed'}>
        <button type="button" className="sandbox__toggle" onClick={() => setOpen((o) => !o)}>
          {open ? '×' : 'Песочница'}
        </button>
        {open && (
          <div className="sandbox__body">
            <Picker title={`Джокеры (${jokers.length}/${MAX_JOKERS})`} ids={JOKER_IDS} picks={jokers} label={(id) => JOKERS[id].name} onToggle={(id) => setJokers((p) => toggle(p, id, MAX_JOKERS))} />
            <Picker title={`Фокусы (${focuses.length}/${MAX_FOCUSES})`} ids={FOCUS_IDS} picks={focuses} label={(id) => FOCUSES[id].name} onToggle={(id) => setFocuses((p) => toggle(p, id, MAX_FOCUSES))} />
            <label className="sandbox__row">
              Бой
              <select value={stage} onChange={(e) => setStage(Number(e.target.value))}>
                {RUN_SCHEDULE.map((enemy, i) => (
                  <option key={enemy.name + String(i)} value={i}>
                    {i + 1}. {enemy.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="sandbox__pick" onClick={reset}>Новая раздача</button>
          </div>
        )}
      </aside>
    </SettingsProvider>
  );
}

import { createRun, createShopRun, FOCUS_IDS, FOCUSES, JOKER_IDS, JOKERS, MAX_FOCUSES, MAX_JOKERS, RUN_SCHEDULE, type FocusId, type JokerId } from '@game/durak';
import { useMemo, useState } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { DurakRunScreen } from '../games/durak/DurakRunScreen';
import { randomSeed } from '../seed';
import { Backdrop } from '../ui/Backdrop';
import { PixelStage } from '../ui/PixelStage';
import { SettingsProvider } from '../ui/SettingsContext';
import { stageEnabled } from '../ui/stageFlag';
import './sandbox.css';

const SANDBOX_COINS = 50;
const MAX_SANDBOX_COINS = 99;

type Start = 'fight' | 'shop';

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
 * MAX_JOKERS and MAX_FOCUSES at once), the coins, where it starts (a fight, or the shop after one) and a fresh deal.
 * Nothing is saved.
 */
export function SandboxApp() {
  const [open, setOpen] = useState(true);
  const [jokers, setJokers] = useState<readonly JokerId[]>(() => JOKER_IDS.slice(0, MAX_JOKERS));
  const [focuses, setFocuses] = useState<readonly FocusId[]>(() => FOCUS_IDS.slice(0, MAX_FOCUSES));
  const [stage, setStage] = useState(0);
  const [start, setStart] = useState<Start>('fight');
  const [coins, setCoins] = useState(SANDBOX_COINS);
  const [seed, setSeed] = useState(randomSeed);
  // The sandbox always shows the pixel screens (as `?pixel` does); `?sandbox&pixel=0` brings the old ones back.
  const [onStage] = useState(() => stageEnabled(window.location.search, '1'));

  // No shop follows the last fight, so a shop start offers one fewer stage.
  const lastStage = start === 'shop' ? RUN_SCHEDULE.length - 2 : RUN_SCHEDULE.length - 1;
  const shownStage = Math.min(stage, lastStage);
  const run = useMemo(() => {
    const loadout = { jokers, focuses, stage: shownStage, coins };
    return start === 'shop' ? createShopRun(seed, loadout) : createRun(seed, loadout);
  }, [seed, jokers, focuses, shownStage, coins, start]);
  const runKey = `${seed}:${jokers.join()}:${focuses.join()}:${shownStage}:${coins}:${start}`;
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
              Старт
              <select value={start} onChange={(e) => setStart(e.target.value as Start)}>
                <option value="fight">Бой</option>
                <option value="shop">Магазин</option>
              </select>
            </label>
            <label className="sandbox__row">
              Монеты
              <input type="number" min={0} max={MAX_SANDBOX_COINS} value={coins} onChange={(e) => setCoins(Math.min(MAX_SANDBOX_COINS, Math.max(0, Math.floor(Number(e.target.value)) || 0)))} />
            </label>
            <label className="sandbox__row">
              {start === 'shop' ? 'После боя' : 'Бой'}
              <select value={shownStage} onChange={(e) => setStage(Number(e.target.value))}>
                {RUN_SCHEDULE.slice(0, lastStage + 1).map((enemy, i) => (
                  <option key={enemy.name + String(i)} value={i}>
                    {i + 1}. {enemy.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="sandbox__pick" onClick={reset}>{start === 'shop' ? 'Новый магазин' : 'Новая раздача'}</button>
          </div>
        )}
      </aside>
    </SettingsProvider>
  );
}

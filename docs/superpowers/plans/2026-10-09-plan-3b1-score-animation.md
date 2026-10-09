# Score Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every «Беру» plays a Balatro-like step-by-step scoring show (cards → jokers → «Ф × М = Урон»), for both sides, with an animation-speed setting x1/x1.5/x2/x3 and tap-to-skip.

**Architecture:** A pure `scoreTimeline(score, speed)` turns the engine's `lastScore.steps` into timed events. `useDurakRun` holds the pre-take state on screen while a take is being scored (the real state is already saved). A playback hook schedules the events; `ScoreBoard` (over the table) and `ScorePops` (a portal with floating labels, element bounces, ticks and a full-screen skip button) render them. When playback ends the held state is released, the HP bar drops and shakes, and the game continues.

**Tech Stack:** TypeScript strict, React 19, motion/react, zod 4, Vitest (node env, no DOM), Playwright (Pixel 7).

**Spec:** `docs/superpowers/specs/2026-10-09-score-animation-design.md`

## Global Constraints

- Animation on every «Беру», both when the enemy takes (the player's jokers score) and when the player takes (the enemy's jokers, then the player's defensive jokers).
- Timing at x1: step 350 ms, final 600 ms, board fade 200 ms. Setting «Скорость анимации»: x1 / x1.5 / x2 / x3 divides every duration; default x1; persisted in settings (zod, per-field `.catch`).
- Labels: chips `+N` (blue), mult `+N множ.` (red), times `×N` (bigger, own sound), final `Ф × М = Урон` on the board and `−N` over the taker's HP bar.
- Tap/click anywhere during scoring → jump to the final. Player input blocked and the AI waits while scoring.
- `prefers-reduced-motion` → no bounces, numbers only (pops fade, no scale/travel).
- The old HP-bar hit pop (`HitPop`, `hitInfoFor`, `useLingeringHit`) is removed; the HP bar keeps its shake.
- Russian UI copy; code, comments and commits in English; conventional commits; immutability; files < 400 lines.
- Out of scope: joker drag-and-drop, new joker art, music.

## Review Focus

- A take that wins or loses the fight: the win/lose overlay must appear only after the board finishes (the held pre-take state has no winner) — pinned by a `scoredTake` unit test in Task 3.
- Reload during the board: the save already holds the post-take state, so «Продолжить забег» shows the damaged HP and no replay — pinned by an e2e test in Task 5.
- Repeated taps on skip: a second tap must not restart or double-commit — `playbackCues` from the final index is idempotent (Task 2 unit) and the e2e double-clicks skip (Task 5).
- A pop target missing from the DOM (enemy ×1 has no tier chip, a joker list re-rendered): the pop falls back to the board, never throws — pinned by an `anchorFor` unit test in Task 2.
- A corrupted speed in storage (`"fast"`, `0`, `4`) falls back to x1 without resetting other settings — pinned in Task 1.

---

### Task 1: Animation speed setting

**Files:**
- Modify: `apps/web/src/ui/settings.ts`
- Modify: `apps/web/src/ui/settings.test.ts`
- Modify: `apps/web/src/screens/SettingsScreen.tsx` (after the «Покачивание карт» row)
- Modify: `apps/web/src/screens/menu.css`
- Modify: `e2e/settings.spec.ts`

**Interfaces:**
- Produces: `export const ANIM_SPEEDS = [1, 1.5, 2, 3] as const; export type AnimSpeed = (typeof ANIM_SPEEDS)[number];` and `Settings.animSpeed: AnimSpeed` (default `1`).

- [ ] **Step 1: Write the failing tests** — append inside `describe('parseSettings', ...)` in `settings.test.ts`, and update the existing defaults test to expect `animSpeed: 1` in `DEFAULT_SETTINGS` if it compares the whole object:

```ts
  it('defaults the animation speed to x1 and keeps each valid speed', () => {
    expect(parseSettings({}).animSpeed).toBe(1);
    for (const speed of [1, 1.5, 2, 3]) expect(parseSettings({ animSpeed: speed }).animSpeed).toBe(speed);
  });

  it('repairs a bad animation speed without touching the rest', () => {
    for (const bad of ['fast', 0, 4, null]) {
      const parsed = parseSettings({ animSpeed: bad, sway: false });
      expect(parsed.animSpeed).toBe(1);
      expect(parsed.sway).toBe(false);
    }
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run apps/web/src/ui/settings.test.ts`
Expected: FAIL — `animSpeed` is `undefined`.

- [ ] **Step 3: Implement** in `settings.ts`:

```ts
/** Scoring animation speed: every duration is divided by it. */
export const ANIM_SPEEDS = [1, 1.5, 2, 3] as const;
export type AnimSpeed = (typeof ANIM_SPEEDS)[number];

function isAnimSpeed(value: unknown): value is AnimSpeed {
  return ANIM_SPEEDS.some((speed) => speed === value);
}
```

Add to `Settings`: `/** Scoring animation speed (x1…x3). */ readonly animSpeed: AnimSpeed;`, to `DEFAULT_SETTINGS`: `animSpeed: 1`, to the schema: `animSpeed: z.custom<AnimSpeed>(isAnimSpeed).catch(DEFAULT_SETTINGS.animSpeed),`. Import `ANIM_SPEEDS` in `SettingsScreen.tsx` and insert after the sway `<label>`:

```tsx
        <fieldset className="settings__group">
          <legend className="settings__label">Скорость анимации</legend>
          <div className="settings__speeds">
            {ANIM_SPEEDS.map((speed) => (
              <label key={speed} className="settings__speed">
                <input
                  type="radio"
                  name="anim-speed"
                  checked={settings.animSpeed === speed}
                  onChange={() => update({ animSpeed: speed })}
                />
                x{speed}
              </label>
            ))}
          </div>
        </fieldset>
```

`menu.css`:

```css
.settings__speeds { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.settings__speed { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 4px; border: 2px solid rgb(255 255 255 / 20%); border-radius: 6px; }
.settings__speed:has(input:checked) { border-color: var(--gold); }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run apps/web/src/ui/settings.test.ts && npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 5: e2e** — append to `e2e/settings.spec.ts`:

```ts
test('the animation speed is x1 by default and x3 survives a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByRole('radio', { name: 'x1', exact: true })).toBeChecked();
  await page.getByRole('radio', { name: 'x3' }).check();
  await page.reload();
  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByRole('radio', { name: 'x3' })).toBeChecked();
});
```

Run: `npx playwright test e2e/settings.spec.ts`
Expected: all settings tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/ui/settings.ts apps/web/src/ui/settings.test.ts apps/web/src/screens/SettingsScreen.tsx apps/web/src/screens/menu.css e2e/settings.spec.ts
git commit -m "feat(web): animation speed setting x1/x1.5/x2/x3"
```

---

### Task 2: Pure score timeline

**Files:**
- Modify: `packages/durak/src/jokers/catalog.ts` (export `CARD_JOKERS`)
- Create: `apps/web/src/games/durak/scoreTimeline.ts`
- Create: `apps/web/src/games/durak/scoreTimeline.test.ts`

**Interfaces:**
- Consumes: `AnimSpeed` (Task 1); `ScoredHit`, `ScoreStep`, `PlayerId`, `JokerId` from `@game/durak`; `formatMult` from `./hits`.
- Produces:

```ts
export const STEP_MS = 350; export const FINAL_MS = 600; export const BOARD_FADE_MS = 200;
export type ScoreTarget =
  | { readonly kind: 'card'; readonly cardId: string }
  | { readonly kind: 'joker'; readonly side: PlayerId; readonly slot: number }
  | { readonly kind: 'tier' }
  | { readonly kind: 'hp'; readonly side: PlayerId };
export type PopTone = 'chips' | 'mult' | 'times' | 'final';
export type TimelineEvent = {
  readonly at: number; readonly duration: number;
  readonly pop: ScoreTarget; readonly bounce: readonly ScoreTarget[];
  readonly label: string; readonly tone: PopTone;
  readonly chips: number; readonly mult: number; readonly damage: number | null;
};
export type Timeline = { readonly events: readonly TimelineEvent[]; readonly end: number };
export type Board = { readonly chips: number; readonly mult: number; readonly damage: number | null };
export function scoreTimeline(score: ScoredHit, speed: AnimSpeed): Timeline;
export function boardAt(timeline: Timeline, index: number): Board;
export function playbackCues(timeline: Timeline, from: number): { readonly cues: readonly { readonly at: number; readonly index: number }[]; readonly doneAt: number };
export function targetSelector(target: ScoreTarget): string;
export const BOARD_SELECTOR = '[data-score-board]';
export function anchorFor<T>(target: ScoreTarget, query: (selector: string) => T | null): T | null;
```

- [ ] **Step 1: Export the per-card jokers** — in `catalog.ts`, next to the other constants:

```ts
/** Jokers that act once per taken card (their pop shows over that card). Keep in sync with `cardEffect` in score.ts. */
export const CARD_JOKERS: readonly JokerId[] = ['hearts', 'diamonds', 'clubs', 'spades', 'small'];
```

- [ ] **Step 2: Write the failing tests** — `scoreTimeline.test.ts`:

```ts
import type { Card } from '@game/core';
import type { ScoredHit, ScoreStep } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { anchorFor, boardAt, playbackCues, scoreTimeline, targetSelector } from './scoreTimeline';

const ace: Card = { id: 'hearts-14', suit: 'hearts', rank: 14 };
const six: Card = { id: 'clubs-6', suit: 'clubs', rank: 6 };

const cardStep = (card: Card, value: number, chips: number): ScoreStep => ({ source: { kind: 'card', card }, effect: { kind: 'chips', value }, chips, mult: 1 });

function hit(steps: readonly ScoreStep[], target: ScoredHit['target'] = 'enemy'): ScoredHit {
  const last = steps.at(-1);
  const chips = last?.chips ?? 0;
  const mult = last?.mult ?? 1;
  return { chips, mult, damage: Math.floor(chips * mult), steps, target };
}

describe('scoreTimeline', () => {
  it('times each step after the board fades in, then the final', () => {
    const t = scoreTimeline(hit([cardStep(ace, 3, 3), cardStep(six, 1, 4)]), 1);
    expect(t.events.map((e) => e.at)).toEqual([200, 550, 900]);
    expect(t.events.map((e) => e.duration)).toEqual([350, 350, 600]);
    expect(t.end).toBe(1700);
  });

  it('divides every duration by the speed', () => {
    const t = scoreTimeline(hit([cardStep(ace, 3, 3)]), 3);
    expect(t.events[0]?.at).toBeCloseTo(200 / 3);
    expect(t.events[1]?.at).toBeCloseTo(550 / 3);
    expect(t.events[1]?.duration).toBeCloseTo(200);
    expect(t.end).toBeCloseTo(1350 / 3);
  });

  it('labels chips, mult and times; the final shows the damage over the taker HP bar', () => {
    const steps: ScoreStep[] = [
      cardStep(ace, 3, 3),
      { source: { kind: 'enhancement', card: ace, enhancement: 'sharp' }, effect: { kind: 'mult', value: 1 }, chips: 3, mult: 2 },
      { source: { kind: 'joker', side: 'attacker', slot: 1, joker: 'trumpAce', acting: 'trumpAce' }, effect: { kind: 'times', value: 2 }, chips: 3, mult: 4 },
      { source: { kind: 'joker', side: 'defender', slot: 0, joker: 'thickSkin', acting: 'thickSkin' }, effect: { kind: 'times', value: 0.5 }, chips: 3, mult: 2 },
    ];
    const t = scoreTimeline(hit(steps, 'enemy'), 1);
    expect(t.events.map((e) => [e.label, e.tone])).toEqual([
      ['+3', 'chips'], ['+1 множ.', 'mult'], ['×2', 'times'], ['×0.5', 'times'], ['−6', 'final'],
    ]);
    expect(t.events.at(-1)).toMatchObject({ pop: { kind: 'hp', side: 'enemy' }, bounce: [], chips: 3, mult: 2, damage: 6 });
  });

  it('maps attacker jokers to the opponent of the taker and defender jokers to the taker', () => {
    const steps: ScoreStep[] = [
      cardStep(six, 1, 1),
      { source: { kind: 'joker', side: 'attacker', slot: 2, joker: 'gloat', acting: 'gloat' }, effect: { kind: 'mult', value: 2 }, chips: 1, mult: 3 },
      { source: { kind: 'joker', side: 'defender', slot: 0, joker: 'usurer', acting: 'usurer' }, effect: { kind: 'times', value: 1.5 }, chips: 1, mult: 4.5 },
    ];
    const t = scoreTimeline(hit(steps, 'player'), 1);
    expect(t.events[1]).toMatchObject({ pop: { kind: 'joker', side: 'enemy', slot: 2 }, bounce: [{ kind: 'joker', side: 'enemy', slot: 2 }] });
    expect(t.events[2]).toMatchObject({ pop: { kind: 'joker', side: 'player', slot: 0 } });
  });

  it('pops a per-card joker (and a mirror copying one) over the card while its own ticket bounces', () => {
    const steps: ScoreStep[] = [
      cardStep(ace, 3, 3),
      { source: { kind: 'joker', side: 'attacker', slot: 0, joker: 'mirror', acting: 'hearts' }, effect: { kind: 'chips', value: 3 }, chips: 6, mult: 1 },
      { source: { kind: 'joker', side: 'attacker', slot: 1, joker: 'hearts', acting: 'hearts' }, effect: { kind: 'chips', value: 3 }, chips: 9, mult: 1 },
    ];
    const t = scoreTimeline(hit(steps, 'enemy'), 1);
    expect(t.events[1]).toMatchObject({ pop: { kind: 'card', cardId: 'hearts-14' }, bounce: [{ kind: 'joker', side: 'player', slot: 0 }], label: '+3' });
    expect(t.events[2]).toMatchObject({ pop: { kind: 'card', cardId: 'hearts-14' }, bounce: [{ kind: 'joker', side: 'player', slot: 1 }] });
  });

  it('pops the tier step over the banner and a card step over its card, bouncing it', () => {
    const steps: ScoreStep[] = [
      { source: { kind: 'tier' }, effect: { kind: 'times', value: 1.25 }, chips: 0, mult: 1.25 },
      cardStep(six, 1, 1),
    ];
    const t = scoreTimeline(hit(steps, 'player'), 1);
    expect(t.events[0]).toMatchObject({ pop: { kind: 'tier' }, bounce: [], label: '×1.25' });
    expect(t.events[1]).toMatchObject({ pop: { kind: 'card', cardId: 'clubs-6' }, bounce: [{ kind: 'card', cardId: 'clubs-6' }] });
  });

  it('plays only the final for a hit with no steps', () => {
    const t = scoreTimeline(hit([]), 1);
    expect(t.events).toHaveLength(1);
    expect(t.events[0]).toMatchObject({ at: 200, tone: 'final', label: '−0' });
  });
});

describe('boardAt', () => {
  const t = scoreTimeline(hit([cardStep(ace, 3, 3), cardStep(six, 1, 4)]), 1);
  it('starts at 0 × 1 before the first step', () => {
    expect(boardAt(t, -1)).toEqual({ chips: 0, mult: 1, damage: null });
  });
  it('follows the running values and shows the damage only on the final', () => {
    expect(boardAt(t, 0)).toEqual({ chips: 3, mult: 1, damage: null });
    expect(boardAt(t, 2)).toEqual({ chips: 4, mult: 1, damage: 4 });
  });
});

describe('playbackCues', () => {
  const t = scoreTimeline(hit([cardStep(ace, 3, 3), cardStep(six, 1, 4)]), 1);
  it('cues every event from the start', () => {
    expect(playbackCues(t, 0)).toEqual({ cues: [{ at: 200, index: 0 }, { at: 550, index: 1 }, { at: 900, index: 2 }], doneAt: 1700 });
  });
  it('skipping cues the final at once and is the same when repeated', () => {
    const skip = playbackCues(t, 2);
    expect(skip).toEqual({ cues: [{ at: 0, index: 2 }], doneAt: 800 });
    expect(playbackCues(t, 2)).toEqual(skip);
  });
});

describe('targets', () => {
  it('builds a selector per target kind', () => {
    expect(targetSelector({ kind: 'card', cardId: 'hearts-14' })).toBe('[data-score-card="hearts-14"]');
    expect(targetSelector({ kind: 'joker', side: 'enemy', slot: 1 })).toBe('[data-score-joker="enemy-1"]');
    expect(targetSelector({ kind: 'tier' })).toBe('[data-score-tier]');
    expect(targetSelector({ kind: 'hp', side: 'player' })).toBe('[data-score-hp="player"]');
  });
  it('falls back to the board when the target is not on screen, and to null when neither is', () => {
    const only = (present: string) => (selector: string) => (selector === present ? selector : null);
    expect(anchorFor({ kind: 'tier' }, only('[data-score-tier]'))).toBe('[data-score-tier]');
    expect(anchorFor({ kind: 'tier' }, only('[data-score-board]'))).toBe('[data-score-board]');
    expect(anchorFor({ kind: 'tier' }, only('nothing'))).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run apps/web/src/games/durak/scoreTimeline.test.ts`
Expected: FAIL — cannot resolve `./scoreTimeline`.

- [ ] **Step 4: Implement** `scoreTimeline.ts`:

```ts
import { CARD_JOKERS, type PlayerId, type ScoredHit, type ScoreStep } from '@game/durak';
import type { AnimSpeed } from '../../ui/settings';
import { formatMult } from './hits';

/** Durations at x1; the speed setting divides all of them. */
export const STEP_MS = 350;
export const FINAL_MS = 600;
export const BOARD_FADE_MS = 200;

export type ScoreTarget =
  | { readonly kind: 'card'; readonly cardId: string }
  | { readonly kind: 'joker'; readonly side: PlayerId; readonly slot: number }
  | { readonly kind: 'tier' }
  | { readonly kind: 'hp'; readonly side: PlayerId };

export type PopTone = 'chips' | 'mult' | 'times' | 'final';

/** One beat of the show: a label pops over `pop`, the `bounce` elements jump, the board shows chips/mult after it. */
export type TimelineEvent = {
  readonly at: number;
  readonly duration: number;
  readonly pop: ScoreTarget;
  readonly bounce: readonly ScoreTarget[];
  readonly label: string;
  readonly tone: PopTone;
  readonly chips: number;
  readonly mult: number;
  readonly damage: number | null;
};

export type Timeline = { readonly events: readonly TimelineEvent[]; readonly end: number };
export type Board = { readonly chips: number; readonly mult: number; readonly damage: number | null };

const other = (side: PlayerId): PlayerId => (side === 'player' ? 'enemy' : 'player');

function labelOf(effect: ScoreStep['effect']): string {
  switch (effect.kind) {
    case 'chips':
      return `+${formatMult(effect.value)}`;
    case 'mult':
      return `+${formatMult(effect.value)} множ.`;
    case 'times':
      return `×${formatMult(effect.value)}`;
  }
}

type Beat = Pick<TimelineEvent, 'pop' | 'bounce'>;

/** Where a step pops and what jumps; per-card jokers pop over the card scored just before them. */
function beatOf(step: ScoreStep, taker: PlayerId, lastCard: string | null): Beat {
  const { source } = step;
  switch (source.kind) {
    case 'tier':
      return { pop: { kind: 'tier' }, bounce: [] };
    case 'card':
    case 'enhancement': {
      const card: ScoreTarget = { kind: 'card', cardId: source.card.id };
      return { pop: card, bounce: [card] };
    }
    case 'joker': {
      const ticket: ScoreTarget = { kind: 'joker', side: source.side === 'attacker' ? other(taker) : taker, slot: source.slot };
      const onCard = lastCard !== null && CARD_JOKERS.includes(source.acting);
      return { pop: onCard ? { kind: 'card', cardId: lastCard } : ticket, bounce: [ticket] };
    }
  }
}

function lastCardAfter(step: ScoreStep, previous: string | null): string | null {
  return step.source.kind === 'card' ? step.source.card.id : previous;
}

/** Turns a scored take into timed events: board fade-in, one beat per step, then the final. */
export function scoreTimeline(score: ScoredHit, speed: AnimSpeed): Timeline {
  const step = STEP_MS / speed;
  const fade = BOARD_FADE_MS / speed;
  const beats = score.steps.reduce<{ readonly events: readonly TimelineEvent[]; readonly lastCard: string | null }>(
    (acc, s, i) => {
      const event: TimelineEvent = {
        at: fade + i * step,
        duration: step,
        ...beatOf(s, score.target, acc.lastCard),
        label: labelOf(s.effect),
        tone: s.effect.kind,
        chips: s.chips,
        mult: s.mult,
        damage: null,
      };
      return { events: [...acc.events, event], lastCard: lastCardAfter(s, acc.lastCard) };
    },
    { events: [], lastCard: null },
  );
  const final: TimelineEvent = {
    at: fade + score.steps.length * step,
    duration: FINAL_MS / speed,
    pop: { kind: 'hp', side: score.target },
    bounce: [],
    label: `−${score.damage}`,
    tone: 'final',
    chips: score.chips,
    mult: score.mult,
    damage: score.damage,
  };
  return { events: [...beats.events, final], end: final.at + final.duration + fade };
}

/** The board after event `index` (-1: before the first step). */
export function boardAt(timeline: Timeline, index: number): Board {
  const event = timeline.events[index];
  return event ? { chips: event.chips, mult: event.mult, damage: event.damage } : { chips: 0, mult: 1, damage: null };
}

/** Timers to run from event `from` on (0 — the whole show; the last index — a skip to the final). */
export function playbackCues(timeline: Timeline, from: number) {
  const offset = timeline.events[from]?.at ?? 0;
  const cues = timeline.events.slice(from).map((event, i) => ({ at: event.at - offset, index: from + i }));
  return { cues, doneAt: timeline.end - offset };
}

export const BOARD_SELECTOR = '[data-score-board]';

export function targetSelector(target: ScoreTarget): string {
  switch (target.kind) {
    case 'card':
      return `[data-score-card="${target.cardId}"]`;
    case 'joker':
      return `[data-score-joker="${target.side}-${target.slot}"]`;
    case 'tier':
      return '[data-score-tier]';
    case 'hp':
      return `[data-score-hp="${target.side}"]`;
  }
}

/** The element to pop over: the target, or the board when the target is not on screen. */
export function anchorFor<T>(target: ScoreTarget, query: (selector: string) => T | null): T | null {
  return query(targetSelector(target)) ?? query(BOARD_SELECTOR);
}
```

Note on the step label: chip values are integers, `formatMult` prints them unchanged and keeps any fractional chips readable.

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run apps/web/src/games/durak/scoreTimeline.test.ts && npm run typecheck`
Expected: all PASS, no type errors. If `CARD_JOKERS` is not re-exported from `@game/durak`, check `packages/durak/src/jokers/index.ts` re-exports `./catalog`.

- [ ] **Step 6: Commit**

```bash
git add packages/durak/src/jokers/catalog.ts apps/web/src/games/durak/scoreTimeline.ts apps/web/src/games/durak/scoreTimeline.test.ts
git commit -m "feat(web): pure score timeline — timed beats, board values, skip cues, pop targets"
```

---

### Task 3: Hold the pre-take state while scoring

**Files:**
- Create: `apps/web/src/games/durak/scoring.ts`
- Create: `apps/web/src/games/durak/scoring.test.ts`
- Modify: `apps/web/src/games/durak/useDurakRun.ts`

**Interfaces:**
- Consumes: `RunState`, `ScoredHit`, `createRun` from `@game/durak`.
- Produces: `export function scoredTake(prev: RunState, next: RunState): ScoredHit | null;` and `DurakRun` gains `readonly scoring: ScoredHit | null; readonly finishScoring: () => void;` — `run` is now the state **to show** (the pre-take state while scoring).

- [ ] **Step 1: Write the failing tests** — `scoring.test.ts`:

```ts
import { createRun, type FightState, type RunState, type ScoredHit } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { scoredTake } from './scoring';

const start = createRun(1);

function withFight(run: RunState, patch: Partial<FightState>): RunState {
  if (run.phase.kind !== 'fight') throw new Error('fixture must be a fight');
  return { ...run, phase: { ...run.phase, fight: { ...run.phase.fight, ...patch } } };
}

const score: ScoredHit = { chips: 4, mult: 1, damage: 4, steps: [], target: 'player' };

describe('scoredTake', () => {
  it('returns the new score when a take was counted', () => {
    const next = withFight(start, { lastScore: score, fightTakes: { player: 1, enemy: 0 } });
    expect(scoredTake(start, next)).toBe(score);
  });

  it('still holds a take that ends the fight, so the overlay waits for the board', () => {
    const next = withFight(start, { lastScore: score, fightTakes: { player: 1, enemy: 0 }, winner: 'enemy' });
    expect(scoredTake(start, next)).toBe(score);
  });

  it('ignores actions that count no take', () => {
    const before = withFight(start, { lastScore: score, fightTakes: { player: 1, enemy: 0 } });
    const after = withFight(before, { roundNumber: 2 });
    expect(scoredTake(before, after)).toBeNull();
  });

  it('ignores leaving the fight phase', () => {
    const over = { ...start, phase: { kind: 'over', won: false } } as RunState;
    expect(scoredTake(start, over)).toBeNull();
  });
});
```

If `phase: { kind: 'over', won: false }` does not match the `RunState` union exactly, build the non-fight state the same way `runStorage.test.ts` does.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run apps/web/src/games/durak/scoring.test.ts`
Expected: FAIL — cannot resolve `./scoring`.

- [ ] **Step 3: Implement** `scoring.ts`:

```ts
import type { RunState, ScoredHit } from '@game/durak';

function takes(run: RunState): number {
  return run.phase.kind === 'fight' ? run.phase.fight.fightTakes.player + run.phase.fight.fightTakes.enemy : 0;
}

/** The take a step just scored, if any: the screen replays it before showing the new state. */
export function scoredTake(prev: RunState, next: RunState): ScoredHit | null {
  if (prev.phase.kind !== 'fight' || next.phase.kind !== 'fight') return null;
  return takes(next) > takes(prev) ? next.phase.fight.lastScore : null;
}
```

Rewrite `useDurakRun.ts` (save still uses the real state; the AI and player wait while held):

```ts
import { applyRunAction, chooseAction, currentActor, enemyAt, type RunAction, type RunState, type ScoredHit } from '@game/durak';
import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from './messages';
import { browserStore, clearRun, saveRun } from './runStorage';
import { scoredTake } from './scoring';

const ENEMY_DELAY_MS = 700;

export type DurakRun = {
  /** The state to show: while a take is being scored, the one before it. */
  readonly run: RunState;
  readonly error: string | null;
  /** Increments on every failed action, so the same error twice still gives feedback. */
  readonly errorSeq: number;
  /** The take being replayed on screen, or null. */
  readonly scoring: ScoredHit | null;
  readonly finishScoring: () => void;
  readonly act: (action: RunAction) => void;
};

type Held = { readonly before: RunState; readonly score: ScoredHit };

export function useDurakRun(initial: RunState): DurakRun {
  const [run, setRun] = useState(initial);
  const [held, setHeld] = useState<Held | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorSeq, setErrorSeq] = useState(0);

  const advance = (prev: RunState, next: RunState): void => {
    const score = scoredTake(prev, next);
    if (score) setHeld({ before: prev, score });
    setRun(next);
  };

  const act = (action: RunAction): void => {
    if (held) return;
    const result = applyRunAction(run, action);
    if (result.ok) {
      advance(run, result.value);
      setError(null);
    } else {
      setError(errorMessage(result.error));
      setErrorSeq((n) => n + 1);
    }
  };

  const finishScoring = useCallback(() => setHeld(null), []);

  useEffect(() => {
    const store = browserStore();
    if (!store) return;
    if (run.phase.kind === 'over') clearRun(store);
    else saveRun(store, run);
  }, [run]);

  useEffect(() => {
    if (held || run.phase.kind !== 'fight') return undefined;
    const { fight } = run.phase;
    if (fight.winner || currentActor(fight.round) !== 'enemy') return undefined;
    const timer = window.setTimeout(() => {
      const action = chooseAction(fight.round, 'enemy', enemyAt(run.stage).style);
      if (!action) {
        console.error('AI returned no action', { stage: run.stage });
        return;
      }
      const result = applyRunAction(run, { type: 'fight', actor: 'enemy', action });
      if (result.ok) advance(run, result.value);
      else console.error('AI chose an illegal action', { action, error: result.error });
    }, ENEMY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [run, held]);

  return { run: held ? held.before : run, error, errorSeq, scoring: held?.score ?? null, finishScoring, act };
}
```

If the react-hooks lint flags `advance` in the AI effect deps, move `advance` out of the component as a plain function taking `setRun`/`setHeld` (both stable) — it reads no render state.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run apps/web/src/games/durak && npm run typecheck`
Expected: PASS, no type errors (`DurakRunScreen` still compiles — it ignores the new fields until Task 5).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/games/durak/scoring.ts apps/web/src/games/durak/scoring.test.ts apps/web/src/games/durak/useDurakRun.ts
git commit -m "feat(web): hold the pre-take state on screen while a take is scored"
```

---

### Task 4: Score targets in the DOM and the score tick sound

**Files:**
- Modify: `apps/web/src/games/durak/TableView.tsx` (`data-score-card`, `children` slot)
- Modify: `apps/web/src/games/durak/JokerPanel.tsx` (`data-score-joker="player-<slot>"` on each filled `li`)
- Modify: `apps/web/src/games/durak/RunHeader.tsx` (`data-score-tier` on the ×tier chip, `data-score-joker="enemy-<i>"` on enemy chips)
- Modify: `apps/web/src/components/HpBar.tsx` (`scoreTarget` → `data-score-hp`; drop the lingering pop, keep the shake)
- Modify: `apps/web/src/games/durak/DurakFightScreen.tsx`, `hits.ts`, `hits.test.ts`, `fight.css`; Delete: `HitPop.tsx`
- Modify: `apps/web/src/ui/sound.ts` (`tickFrequency`, `playScoreTick`)
- Create: `apps/web/src/ui/sound.test.ts`

**Interfaces:**
- Produces: `TableView` prop `children?: ReactNode` (rendered last inside `.table`); `HpBar` props become `{ label, hp, maxHp, shakeKey?: number, scoreTarget?: string, className? }`; `export function tickFrequency(step: number): number; export function playScoreTick(step: number, times: boolean, enabled: boolean): void;`.

- [ ] **Step 1: Write the failing test** — `apps/web/src/ui/sound.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { tickFrequency } from './sound';

describe('tickFrequency', () => {
  it('rises with every step', () => {
    expect(tickFrequency(1)).toBeGreaterThan(tickFrequency(0));
    expect(tickFrequency(5)).toBeGreaterThan(tickFrequency(4));
  });
  it('stops rising after an octave so long takes stay pleasant', () => {
    expect(tickFrequency(40)).toBe(tickFrequency(12));
    expect(tickFrequency(12)).toBeCloseTo(tickFrequency(0) * 2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run apps/web/src/ui/sound.test.ts`
Expected: FAIL — `tickFrequency` is not exported.

- [ ] **Step 3: Implement the sound** — append to `sound.ts`:

```ts
/** Scoring ticks climb a semitone per step, up to an octave. */
const TICK_BASE_HZ = 392;
const TICK_MAX_STEPS = 12;

export function tickFrequency(step: number): number {
  return TICK_BASE_HZ * 2 ** (Math.min(step, TICK_MAX_STEPS) / 12);
}

/** One scoring beat; a «×» step rings a brighter two-note chime. */
export function playScoreTick(step: number, times: boolean, enabled: boolean): void {
  if (!enabled) return;
  const freq = tickFrequency(step);
  if (times) {
    tone(freq, 0.22, 'triangle', 0.06);
    tone(freq * 1.5, 0.26, 'triangle', 0.05, undefined, 0.05);
  } else {
    tone(freq, 0.1, 'sine', 0.045);
  }
}
```

Run: `npx vitest run apps/web/src/ui/sound.test.ts` — Expected: PASS.

- [ ] **Step 4: Mark the targets.**

`TableView.tsx` — accept `children?: ReactNode` (import `type ReactNode` from `react`) and render:

```tsx
    <div className="table panel" data-testid="table">
      {table.map((pair) => (
        <div key={pair.attack.id} className="table__pair" data-score-card={pair.attack.id}>
          {/* …unchanged pair content… */}
        </div>
      ))}
      {children}
    </div>
```

`fight.css`: add `position: relative;` to the `.table` rule (the board is absolutely positioned, so it takes no grid cell).

`JokerPanel.tsx` — the map callback gets the index: `jokers.map((id, slot) => ...)`; the wide `li` gets ``data-score-joker={`player-${slot}`}``; `CompactTicket` gets a `slot: number` prop and its `li` the same attribute. Placeholders get none.

`RunHeader.tsx` — `<span className="chip" data-score-tier>×{TIER_MULT[enemy.tier]}</span>`; `enemy.jokers.map((id, i) => <span key={id} className="chip" data-score-joker={`enemy-${i}`} …>)`.

`HpBar.tsx` — replace the whole file:

```tsx
import { motion } from 'motion/react';
import { hpSegments } from './hpSegments';

const SHAKE = { x: [0, -5, 5, -3, 3, 0] };

type HpBarProps = {
  readonly label: string;
  readonly hp: number;
  readonly maxHp: number;
  /** Changes on every hit to this bar to replay the shake; 0 — no hit. */
  readonly shakeKey?: number;
  /** `data-score-hp` value: where the scoring final pops its damage. */
  readonly scoreTarget?: string;
  /** Extra class for screen layout (grid placement). */
  readonly className?: string;
};

export function HpBar({ label, hp, maxHp, shakeKey = 0, scoreTarget, className = '' }: HpBarProps) {
  return (
    <div
      className={`hp panel ${className}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={maxHp}
      aria-valuenow={hp}
      data-score-hp={scoreTarget}
    >
      <span className="hp__label">{label}</span>
      <motion.div key={shakeKey} className="hp__track" animate={shakeKey ? SHAKE : {}} transition={{ duration: 0.35 }}>
        {hpSegments(hp, maxHp).map((fill, i) => (
          <span key={i} className="hp__seg">
            {fill > 0 && <span className="hp__seg-fill" style={{ width: `${fill * 100}%` }} />}
          </span>
        ))}
      </motion.div>
      <span className="hp__value">
        {hp}/{maxHp}
      </span>
    </div>
  );
}
```

`DurakFightScreen.tsx` — replace both `hit=`/`hitKey=` pairs with (and `'player'` for the player bar):

```tsx
            shakeKey={fight.hits.some((h) => h.target === 'enemy') ? fight.hitSeq : 0}
            scoreTarget="enemy"
```

Drop the `hitPop` helper and the `HitPop`/`hitInfoFor` imports. Delete `HitPop.tsx`; in `hits.ts` delete `HitInfo` and `hitInfoFor` (keep `formatMult`); in `hits.test.ts` delete their tests and keep/add `formatMult` tests: `formatMult(1.5) === '1.5'`, `formatMult(2) === '2'`, `formatMult(1.255)` equal to whatever `String(Math.round(1.255 * 100) / 100)` gives (run it first, assert that). Remove the `.hp__hit` and `.hit-pop*` rules from `fight.css`.

Run: `grep -rn "hit-pop\|hitInfoFor\|HitPop\|hp__hit\|hit-Соперник\|hit-Ты" apps e2e`
Expected: no matches.

- [ ] **Step 5: Run to verify**

Run: `npm test && npm run typecheck`
Expected: all unit tests PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add -A apps/web/src
git commit -m "feat(web): score targets on cards, tickets, banner and HP bars; rising score tick; drop the old hit pop"
```

---

### Task 5: Board, pops, skip and wiring

**Files:**
- Create: `apps/web/src/games/durak/useScorePlayback.ts`
- Create: `apps/web/src/games/durak/ScoreBoard.tsx`
- Create: `apps/web/src/games/durak/ScorePops.tsx`
- Create: `apps/web/src/games/durak/score.css`
- Modify: `apps/web/src/games/durak/DurakFightScreen.tsx`
- Modify: `apps/web/src/games/durak/DurakRunScreen.tsx`
- Create: `e2e/score.spec.ts`

**Interfaces:**
- Consumes: `scoreTimeline`, `boardAt`, `playbackCues`, `anchorFor`, `targetSelector`, `Board`, `TimelineEvent`, `ScoreTarget` (Task 2); `scoring`, `finishScoring` (Task 3); `TableView children`, `playScoreTick` (Task 4); `settings.animSpeed` (Task 1).
- Produces: `export type Playback = { readonly active: boolean; readonly index: number; readonly current: TimelineEvent | null; readonly board: Board | null; readonly skip: () => void }; export function useScorePlayback(score: ScoredHit | null, speed: AnimSpeed, onDone: () => void): Playback;`

- [ ] **Step 1: Write the failing e2e** — `e2e/score.spec.ts` (seed 1: the enemy attacks first, verified with `createRun(1).phase.fight.round.attacker === 'enemy'`, so «Беру» comes up):

```ts
import { expect, test, type Page } from '@playwright/test';

async function takeTheTable(page: Page): Promise<void> {
  await page.goto('/?seed=1');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await page.getByRole('button', { name: 'Беру' }).click({ timeout: 5_000 });
}

const playerHp = (page: Page) => page.getByRole('meter', { name: 'Ты' });

test('a take plays the scoring board with pops over the cards, then the damage lands', async ({ page }) => {
  await takeTheTable(page);
  const board = page.getByTestId('score-board');
  await expect(board).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('score-pop').first()).toBeVisible();
  await expect(playerHp(page)).toHaveAttribute('aria-valuenow', '40');
  await expect(board).toBeHidden({ timeout: 10_000 });
  await expect(playerHp(page)).not.toHaveAttribute('aria-valuenow', '40');
});

test('a tap skips to the final, and a second tap does no harm', async ({ page }) => {
  await takeTheTable(page);
  await expect(page.getByTestId('score-board')).toBeVisible({ timeout: 5_000 });
  const skip = page.getByTestId('score-skip');
  await skip.click();
  await skip.click({ force: true, timeout: 500 }).catch(() => undefined);
  await expect(page.getByTestId('score-board')).toContainText('=');
  await expect(page.getByTestId('score-board')).toBeHidden({ timeout: 1_500 });
  await expect(playerHp(page)).not.toHaveAttribute('aria-valuenow', '40');
});

test('a reload during scoring continues with the damage already taken and no replay', async ({ page }) => {
  await takeTheTable(page);
  await expect(page.getByTestId('score-board')).toBeVisible({ timeout: 5_000 });
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await expect(playerHp(page)).not.toHaveAttribute('aria-valuenow', '40');
  await expect(page.getByTestId('score-board')).toHaveCount(0);
});
```

Run: `npx playwright test e2e/score.spec.ts`
Expected: FAIL — `score-board` never appears.

- [ ] **Step 2: Implement the playback hook** — `useScorePlayback.ts`:

```ts
import type { ScoredHit } from '@game/durak';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnimSpeed } from '../../ui/settings';
import { boardAt, playbackCues, scoreTimeline, type Board, type Timeline, type TimelineEvent } from './scoreTimeline';

export type Playback = {
  readonly active: boolean;
  /** The event on screen (-1: the board just appeared). */
  readonly index: number;
  readonly current: TimelineEvent | null;
  readonly board: Board | null;
  readonly skip: () => void;
};

type Shown = { readonly timeline: Timeline; readonly index: number };

/** Plays a scored take: one event per cue, then `onDone`. A skip restarts the cues from the final. */
export function useScorePlayback(score: ScoredHit | null, speed: AnimSpeed, onDone: () => void): Playback {
  const timeline = useMemo(() => (score ? scoreTimeline(score, speed) : null), [score, speed]);
  const [shown, setShown] = useState<Shown | null>(null);
  const [skipped, setSkipped] = useState<Timeline | null>(null);
  const done = useRef(onDone);
  done.current = onDone;

  const finalIndex = timeline ? timeline.events.length - 1 : 0;
  const from = timeline && skipped === timeline ? finalIndex : 0;

  useEffect(() => {
    if (!timeline) return undefined;
    const { cues, doneAt } = playbackCues(timeline, from);
    const timers = cues.map((cue) => window.setTimeout(() => setShown({ timeline, index: cue.index }), cue.at));
    timers.push(window.setTimeout(() => done.current(), doneAt));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [timeline, from]);

  if (!timeline) return { active: false, index: -1, current: null, board: null, skip: () => undefined };
  const index = shown?.timeline === timeline ? shown.index : -1;
  return {
    active: true,
    index,
    current: timeline.events[index] ?? null,
    board: boardAt(timeline, index),
    skip: () => {
      if (skipped !== timeline) setSkipped(timeline);
    },
  };
}
```

- [ ] **Step 3: Implement the board** — `ScoreBoard.tsx`:

```tsx
import { formatMult } from './hits';
import type { Board } from './scoreTimeline';

/** Balatro-style board over the table: blue chips × red mult, and «= damage» on the final. */
export function ScoreBoard({ board }: { readonly board: Board }) {
  return (
    <div className="score-board" data-testid="score-board" data-score-board aria-live="polite">
      <span className="score-board__cell score-board__cell--chips">
        <span className="score-board__caption">Фишки</span>
        {formatMult(board.chips)}
      </span>
      <span className="score-board__times">×</span>
      <span className="score-board__cell score-board__cell--mult">
        <span className="score-board__caption">Множитель</span>
        {formatMult(board.mult)}
      </span>
      {board.damage !== null && <span className="score-board__damage">= {board.damage}</span>}
    </div>
  );
}
```

- [ ] **Step 4: Implement the pops, bounces, ticks and skip** — `ScorePops.tsx`:

```tsx
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSettings } from '../../ui/SettingsContext';
import { playScoreTick } from '../../ui/sound';
import { anchorFor, targetSelector, type ScoreTarget } from './scoreTimeline';
import type { Playback } from './useScorePlayback';

const BOUNCE_MAX_MS = 260;

function bounce(target: ScoreTarget, duration: number): void {
  const element = document.querySelector(targetSelector(target));
  element?.animate(
    [{ transform: 'translateY(0)' }, { transform: 'translateY(-12%) scale(1.08)' }, { transform: 'translateY(0)' }],
    { duration: Math.min(BOUNCE_MAX_MS, duration), easing: 'ease-out' },
  );
}

/** Floating labels over the scored elements, their bounces and ticks, and a full-screen tap-to-skip. */
export function ScorePops({ playback }: { readonly playback: Playback }) {
  const { settings } = useSettings();
  const reduced = useReducedMotion() ?? false;
  const { active, index, current, skip } = playback;

  useEffect(() => {
    if (!current) return;
    if (!reduced) current.bounce.forEach((target) => bounce(target, current.duration));
    if (current.tone !== 'final') playScoreTick(index, current.tone === 'times', settings.sound);
  }, [current, index, reduced, settings.sound]);

  const rect = useMemo(
    () => (current ? (anchorFor(current.pop, (selector) => document.querySelector(selector))?.getBoundingClientRect() ?? null) : null),
    [current],
  );

  if (!active) return null;
  return createPortal(
    <>
      <button type="button" className="score-skip" data-testid="score-skip" aria-label="Пропустить подсчёт" onClick={skip} />
      <AnimatePresence>
        {current && rect && (
          <span key={index} className="score-pop-anchor" style={{ left: rect.left + rect.width / 2, top: rect.top }}>
            <motion.span
              data-testid="score-pop"
              className={`score-pop score-pop--${current.tone}`}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.5 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: -14, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {current.label}
            </motion.span>
          </span>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}
```

- [ ] **Step 5: Styles** — `score.css`:

```css
.score-board {
  position: absolute;
  top: 6px;
  left: 50%;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 3px solid #000000;
  border-radius: 8px;
  background: rgb(27 20 38 / 94%);
  box-shadow: 0 4px 0 rgb(0 0 0 / 55%);
  transform: translateX(-50%);
  font-family: var(--font-text);
  font-weight: 800;
  white-space: nowrap;
  animation: score-board-in 0.2s ease-out;
}
.score-board__cell { display: flex; flex-direction: column; align-items: center; min-width: 3.2em; padding: 2px 8px; border: 2px solid #000000; border-radius: 5px; color: #ffffff; font-size: 1.2rem; box-shadow: 0 2px 0 rgb(0 0 0 / 55%); }
.score-board__caption { font-size: 0.6rem; font-weight: 700; opacity: 0.85; }
.score-board__cell--chips { background: #2f7dd1; }
.score-board__cell--mult { background: #e24a3b; }
.score-board__times { color: #ff8a73; font-size: 1.2rem; text-shadow: 1px 1px 0 #000000; }
.score-board__damage { font-family: var(--font-head); font-size: 1.1rem; color: #ffd166; text-shadow: 2px 2px 0 #000000; }
@keyframes score-board-in { from { opacity: 0; transform: translateX(-50%) scale(0.85); } }

.score-skip { position: fixed; inset: 0; z-index: 50; padding: 0; border: 0; background: transparent; cursor: pointer; }
.score-pop-anchor { position: fixed; z-index: 51; transform: translate(-50%, -100%); pointer-events: none; }
.score-pop { display: inline-block; padding: 2px 8px; border: 2px solid #000000; border-radius: 6px; font-family: var(--font-head); font-size: 0.85rem; color: #ffffff; text-shadow: 2px 2px 0 #000000; box-shadow: 0 3px 0 rgb(0 0 0 / 55%); white-space: nowrap; }
.score-pop--chips { background: #2f7dd1; }
.score-pop--mult { background: #e24a3b; }
.score-pop--times { background: #e24a3b; font-size: 1.15rem; }
.score-pop--final { background: #1b1426; color: #ff5a4a; font-size: 1.4rem; }

@media (prefers-reduced-motion: reduce) {
  .score-board { animation: none; }
}
```

- [ ] **Step 6: Wire it.** `DurakRunScreen.tsx`: take `scoring, finishScoring` from `useDurakRun` and pass `scoring={scoring}` and `onScoringDone={finishScoring}` to `DurakFightScreen`.

`DurakFightScreen.tsx`: add props `readonly scoring: ScoredHit | null; readonly onScoringDone: () => void;` (import `type ScoredHit`), import `'./score.css'`, `ScoreBoard`, `ScorePops`, `useScorePlayback`, then:

```tsx
  const playback = useScorePlayback(scoring, settings.animSpeed, onScoringDone);
  const myTurn = !playback.active && !fight.winner && currentActor(round) === 'player';
```

Render the board inside the table and the pops after the overlay:

```tsx
          <TableView table={round.table} attacker={round.attacker}>
            {playback.board && <ScoreBoard board={playback.board} />}
          </TableView>
          {/* … */}
      <FightOverlay state={fight} onNextRound={() => onFightAction({ type: 'nextRound' })} onLeaveFight={onLeaveFight} />
      <ScorePops playback={playback} />
```

- [ ] **Step 7: Run to verify**

Run: `npx playwright test e2e/score.spec.ts`
Expected: 3 PASS.
Run: `npm test && npm run typecheck && npx playwright test`
Expected: all unit tests and all e2e PASS (18 previous + 1 settings + 3 score = 22). If `durak.spec.ts` «the player can make a move» now waits on a take's board, give its status assertion `{ timeout: 10_000 }` and ledger a ruling.

- [ ] **Step 8: Manual check** on the running dev server (`http://localhost:5173/?seed=1`, portrait and 1280×800, via chrome-devtools screenshots): pops sit over the right cards/tickets, the board does not hide the table cards, x3 is visibly faster, Settings → Скорость анимации works. Note anything off in the ledger.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/games/durak e2e/score.spec.ts
git commit -m "feat(web): Balatro-like scoring show on every take — board, pops, bounces, ticks, tap to skip"
```

Then set the spec status line to `Статус: реализован` and, in the jokers spec §8, mark the scoring animation and speed setting of «План 3b» done; commit `docs: score animation implemented`.

# Juice stage 1 (feel foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cards, jokers and shop goods tilt towards the finger, breathe, and the hand lies in a spring-driven fan; panels and buttons get a thick pixel look; everything is switchable.

**Architecture:** Only `apps/web` changes. A new motion layer (`useMotionEnabled`, a separate visual rng, a pure `handLayout`, a pure `tiltAngles`) sits under the existing `FeelBox`; the hand moves from flex+margins to absolutely positioned slots driven by `transform`. Sprites that show at a fractional scale are pre-shrunk by a whole factor (coin, icons) or pinned to ×1 (74 px cards on tall phones).

**Tech Stack:** TypeScript strict, React 19, `motion/react`, Vitest (node env, `apps/web/src/**/*.test.ts`), Playwright (Pixel 7 profile), CSS.

**Spec:** `docs/superpowers/specs/2026-10-11-juice-feel-design.md` (approved 2026-10-11). Instructions it comes from: `docs/instructions.md`.

## Global Constraints

- Only `apps/web`. `packages/durak`, rules, balance and the run save format do not change. `npm run simulate` before and after gives the same result: stage reach 100 / 100 / 69 / 37 / 37 / 9 %.
- Animate only `transform` and `opacity` (and the individual `translate`/`rotate`/`scale` properties), never size or layout.
- Visual randomness (sway phases, jitter) never uses the engine's rng or the game state seed: it uses `visualRandom` / `createVisualRng` from `ui/visualRng.ts`.
- No new libraries, no audio files, sprites are not redrawn or resized in their source files.
- Whole-number scale in CSS px: 74×104 card art at ×1 on phones. Coin and icons are pre-shrunk by a whole factor and shown ×1 with `image-rendering: pixelated`. The only fractional exception: short screens (height below 780 px) keep the current reduced card size, still `pixelated`.
- Tap on a card still plays it at once; there is no select-then-play. A card lifts on hover or press.
- Settings: new fields «Эффекты» (default on) and «Вибрация» (default on, row hidden where `navigator.vibrate` is missing). The old «Покачивание карт» stays and works on top of «Эффекты». `prefers-reduced-motion` switches all new motion off.
- Code, comments and commits in English; UI text in Russian. One stage, one branch (`feat/juice-feel`), one review.
- Every test step lists the command and what it must print; watch each new test fail before the code.

## Review Focus

Failure modes the spec implies that the task tests below pin (most likely first):

1. **Old or broken saved settings** (no `effects`/`vibration`, wrong types) must give the defaults, and one bad value must not reset the others — Task 1 tests.
2. **A hand of 0, 1, 2 or 12 cards on a narrow screen** must stay inside its container and never produce NaN positions — Task 5 `handLayout` tests and the e2e «hand stays on screen».
3. **`prefers-reduced-motion` with «Эффекты» on** must still be completely still — Task 2 e2e.
4. **A card played out of the hand mid-animation** (the hand re-lays out while cards move) must keep the other cards inside the screen and clickable — Task 5 e2e.
5. **A finger dragged off an element or a cancelled touch** must return the tilt to rest and never produce an angle beyond ±tilt/2 — Task 7 `tiltAngles` clamp test.

## File Structure

| File | Responsibility |
|---|---|
| `apps/web/src/ui/settings.ts` | + `effects`, `vibration` fields |
| `apps/web/src/ui/capabilities.ts` (new) | `canVibrate()` |
| `apps/web/src/ui/visualRng.ts` (new) | `createVisualRng`, `visualRandom`, `swayPhases` |
| `apps/web/src/ui/useMotion.ts` (new) | `motionAllowed`, `useMotionEnabled` |
| `apps/web/src/ui/SettingsContext.tsx` | + `useOptionalSettings` |
| `apps/web/src/ui/fpsMeter.ts` (new), `useFps.ts` (new) | frame statistics and the lab's fps badge |
| `scripts/perf.mjs` (new) | `npm run perf`: fps under CPU throttle |
| `apps/web/src/ui/pixel/sheet.ts` | + `shrinkBy`, `padToBox` |
| `apps/web/src/ui/pixel/uiArt.ts`, `cardArt.ts` | coin and icons pre-shrunk by a whole factor |
| `apps/web/src/ui/fan.ts` | + `handLayout` |
| `apps/web/src/ui/useElementWidth.ts` (new), `useFan.ts` (new) | measuring, per-slot styles |
| `apps/web/src/games/durak/FightHands.tsx` | hands use `useFan` |
| `apps/web/src/ui/tilt.ts` (new) | `tiltAngles` |
| `apps/web/src/ui/FeelBox.tsx` | uses tilt + motion hook |
| `apps/web/src/games/durak/JokerPanel.tsx`, `shop/ShopSlot.tsx`, `shop/OwnedJokers.tsx`, `shop/OwnedFocuses.tsx` | wrapped in `FeelBox` |
| `apps/web/src/ui/theme.css`, `games/durak/fight.css`, `shop.css` | tokens, bevels, card scale, hand CSS |
| `apps/web/src/lab/FeelTab.tsx` (new), `CardLab.tsx` | the «Ощущение» stand |
| `e2e/storage-state.json` (new), `playwright.config.ts`, `e2e/motion.spec.ts` (new), `e2e/hand.spec.ts` (new), `e2e/settings.spec.ts`, `e2e/layout.spec.ts` (new) | tests |
| `scripts/shots.mjs` (new) | screenshots and a screen recording |

---

### Task 1: Settings «Эффекты» and «Вибрация»

**Files:**
- Modify: `apps/web/src/ui/settings.ts`, `apps/web/src/ui/settings.test.ts`, `apps/web/src/screens/SettingsScreen.tsx`, `e2e/settings.spec.ts`
- Create: `apps/web/src/ui/capabilities.ts`, `apps/web/src/ui/capabilities.test.ts`

**Interfaces:**
- Produces: `Settings.effects: boolean`, `Settings.vibration: boolean` (both default `true`); `canVibrate(nav?): boolean`.

- [ ] **Step 1: Write the failing tests**

In `apps/web/src/ui/settings.test.ts` replace the expected object of the first test with the new defaults and add tests (put the new `it`s inside `describe('parseSettings')`):

```ts
    expect(DEFAULT_SETTINGS).toEqual({
      palette: 'neon', sound: true, volume: 0.35, sway: true, sort: { bySuit: true, rank: 'asc', trumps: 'last' }, animSpeed: 1, effects: true, vibration: true,
    });
```

```ts
  it('turns effects and vibration on when an older save does not have them', () => {
    const old = parseSettings({ palette: 'neon', sound: false, volume: 0.2, sway: false });
    expect(old.effects).toBe(true);
    expect(old.vibration).toBe(true);
    expect(old.sound).toBe(false);
  });

  it('keeps an explicit off, and a wrong type falls back to on without resetting the other fields', () => {
    expect(parseSettings({ effects: false, vibration: false })).toMatchObject({ effects: false, vibration: false });
    const mixed = parseSettings({ effects: 'yes', vibration: 3, sound: false });
    expect(mixed).toMatchObject({ effects: true, vibration: true, sound: false });
  });
```

Create `apps/web/src/ui/capabilities.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { canVibrate } from './capabilities';

describe('canVibrate', () => {
  it('is true only when the navigator has a vibrate function', () => {
    expect(canVibrate({ vibrate: () => true })).toBe(true);
    expect(canVibrate({})).toBe(false);
    expect(canVibrate({ vibrate: 'nope' })).toBe(false);
    expect(canVibrate(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run them, they must fail**

Run: `npx vitest run apps/web/src/ui/settings.test.ts apps/web/src/ui/capabilities.test.ts`
Expected: FAIL (`effects` missing in `DEFAULT_SETTINGS`; `Cannot find module './capabilities'`).

- [ ] **Step 3: Implement**

`apps/web/src/ui/settings.ts`: add to the `Settings` type after `animSpeed`:

```ts
  /** Master switch for motion effects: sway, tilt and everything the juice stages add. */
  readonly effects: boolean;
  /** Haptic feedback, only where the device has it. */
  readonly vibration: boolean;
```

`DEFAULT_SETTINGS` gets `, effects: true, vibration: true` after `animSpeed: 1`. In `schema` add after `animSpeed`:

```ts
  effects: z.boolean().catch(DEFAULT_SETTINGS.effects),
  vibration: z.boolean().catch(DEFAULT_SETTINGS.vibration),
```

Create `apps/web/src/ui/capabilities.ts`:

```ts
type NavigatorLike = { readonly vibrate?: unknown };

/** Vibration exists on Android browsers, not on iOS: the setting is hidden where it cannot work. */
export function canVibrate(nav: NavigatorLike | undefined = typeof navigator === 'undefined' ? undefined : navigator): boolean {
  return typeof nav?.vibrate === 'function';
}
```

`apps/web/src/screens/SettingsScreen.tsx`: add `import { canVibrate } from '../ui/capabilities';` and, right before the «Покачивание карт» label, insert:

```tsx
        <label className="settings__row">
          <input type="checkbox" checked={settings.effects} onChange={(event) => update({ effects: event.target.checked })} />
          Эффекты
        </label>
        {canVibrate() && (
          <label className="settings__row">
            <input type="checkbox" checked={settings.vibration} onChange={(event) => update({ vibration: event.target.checked })} />
            Вибрация
          </label>
        )}
```

and add `disabled={!settings.effects}` to the «Покачивание карт» checkbox input.

- [ ] **Step 4: Run the unit tests, they must pass**

Run: `npx vitest run apps/web/src/ui/settings.test.ts apps/web/src/ui/capabilities.test.ts`
Expected: PASS (all). Then `npx tsc --noEmit -p .` prints nothing.

- [ ] **Step 5: Add and run the e2e**

Append to `e2e/settings.spec.ts`:

```ts
test('effects and vibration can be switched and stay after a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByLabel('Эффекты').check();
  await page.getByLabel('Вибрация').uncheck();
  await page.reload();
  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByLabel('Эффекты')).toBeChecked();
  await expect(page.getByLabel('Вибрация')).not.toBeChecked();
  await page.getByLabel('Эффекты').uncheck();
  await page.reload();
  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByLabel('Эффекты')).not.toBeChecked();
});
```

Run: `npx playwright test e2e/settings.spec.ts --reporter=line`
Expected: all pass (the new one included).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/ui/settings.ts apps/web/src/ui/settings.test.ts apps/web/src/ui/capabilities.ts apps/web/src/ui/capabilities.test.ts apps/web/src/screens/SettingsScreen.tsx e2e/settings.spec.ts
git commit -m "feat(web): settings «Эффекты» and «Вибрация»"
```

---

### Task 2: Motion layer — visual rng, `useMotionEnabled`, calm e2e

**Files:**
- Create: `apps/web/src/ui/visualRng.ts`, `visualRng.test.ts`, `useMotion.ts`, `useMotion.test.ts`, `e2e/storage-state.json`, `e2e/motion.spec.ts`
- Modify: `apps/web/src/ui/SettingsContext.tsx`, `apps/web/src/ui/FeelBox.tsx`, `playwright.config.ts`

**Interfaces:**
- Consumes: `Settings.effects` (Task 1).
- Produces: `createVisualRng(seed: number): () => number`, `visualRandom: () => number`, `swayPhases(count: number, period: number, random?: () => number): number[]`; `motionAllowed(effects: boolean, reducedMotion: boolean): boolean`; `useMotionEnabled(): boolean`; `useOptionalSettings(): SettingsApi | null`.

- [ ] **Step 1: Write the failing unit tests**

`apps/web/src/ui/visualRng.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createVisualRng, swayPhases } from './visualRng';

describe('createVisualRng', () => {
  it('gives the same sequence for the same seed and a different one for another seed', () => {
    const run = (rng: () => number) => Array.from({ length: 5 }, rng);
    expect(run(createVisualRng(7))).toEqual(run(createVisualRng(7)));
    expect(run(createVisualRng(7))).not.toEqual(run(createVisualRng(8)));
  });

  it('stays in [0, 1)', () => {
    const rng = createVisualRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('swayPhases', () => {
  it('gives one phase per slot inside the period, all different, and the same for the same seed', () => {
    const phases = swayPhases(5, 3.4, createVisualRng(3));
    expect(phases).toHaveLength(5);
    expect(new Set(phases).size).toBe(5);
    for (const p of phases) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(3.4);
    }
    expect(swayPhases(5, 3.4, createVisualRng(3))).toEqual(phases);
  });

  it('is empty for no slots', () => {
    expect(swayPhases(0, 3.4, createVisualRng(1))).toEqual([]);
  });
});
```

`apps/web/src/ui/useMotion.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { motionAllowed } from './useMotion';

describe('motionAllowed', () => {
  it('needs effects on and no reduced-motion preference', () => {
    expect(motionAllowed(true, false)).toBe(true);
    expect(motionAllowed(false, false)).toBe(false);
    expect(motionAllowed(true, true)).toBe(false);
    expect(motionAllowed(false, true)).toBe(false);
  });
});
```

- [ ] **Step 2: Run, must fail**

Run: `npx vitest run apps/web/src/ui/visualRng.test.ts apps/web/src/ui/useMotion.test.ts`
Expected: FAIL (`Cannot find module`).

- [ ] **Step 3: Implement**

`apps/web/src/ui/visualRng.ts`:

```ts
/** mulberry32: a tiny seedable generator. Visual randomness must never touch the engine's rng or the game seed. */
export function createVisualRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The app-wide visual generator, seeded once from Math.random (not from the game state). */
export const visualRandom: () => number = createVisualRng(Math.floor(Math.random() * 2 ** 32));

/** One sway phase (seconds of delay) per slot: spread evenly over the period with some jitter, so neighbours never move in step. */
export function swayPhases(count: number, period: number, random: () => number = visualRandom): number[] {
  return Array.from({ length: count }, (_, i) => ((i + random() * 0.6) / count) * period);
}
```

`apps/web/src/ui/useMotion.ts`:

```ts
import { useReducedMotion } from 'motion/react';
import { useOptionalSettings } from './SettingsContext';

/** The one place that decides whether decorative motion may run. */
export function motionAllowed(effects: boolean, reducedMotion: boolean): boolean {
  return effects && !reducedMotion;
}

/** Works outside the settings provider too (the lab), where effects count as on. */
export function useMotionEnabled(): boolean {
  const api = useOptionalSettings();
  const reduced = useReducedMotion() ?? false;
  return motionAllowed(api?.settings.effects ?? true, reduced);
}
```

`apps/web/src/ui/SettingsContext.tsx`: append

```tsx
/** The settings, or null where no provider is mounted (the lab). */
export function useOptionalSettings(): SettingsApi | null {
  return useContext(SettingsContext);
}
```

`apps/web/src/ui/FeelBox.tsx`: add `import { useMotionEnabled } from './useMotion';` and change `const SWAY_SECONDS = 3.4;` to `export const SWAY_SECONDS = 3.4;`. In `FeelBox` body after `const [squashScope, animate] = useAnimate...` add `const motionOn = useMotionEnabled(); const idleOn = idle && motionOn;`. Replace `idle ?` with `idleOn ?` in both the `animate` and `transition` props, and make the handlers start with a guard:

```tsx
  const onMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (!motionOn) return;
    ...unchanged
```
and `onPointerDown={() => { if (motionOn) void animate(squashScope.current, SQUASH, { duration: 0.38, ease: 'easeOut' }); }}`.

- [ ] **Step 4: Run unit tests and typecheck**

Run: `npx vitest run apps/web/src/ui/visualRng.test.ts apps/web/src/ui/useMotion.test.ts && npx tsc --noEmit -p .`
Expected: PASS, no type errors.

- [ ] **Step 5: Calm e2e by default + the motion e2e**

Create `e2e/storage-state.json`:

```json
{
  "cookies": [],
  "origins": [
    { "origin": "http://localhost:4173", "localStorage": [{ "name": "thegame.settings", "value": "{\"effects\":false}" }] }
  ]
}
```

`playwright.config.ts`: in `use` add `storageState: 'e2e/storage-state.json'` so it reads `use: { baseURL: \`http://localhost:${PORT}\`, storageState: 'e2e/storage-state.json' },`.

Create `e2e/motion.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';

const EFFECTS_ON = { cookies: [], origins: [{ origin: 'http://localhost:4173', localStorage: [{ name: 'thegame.settings', value: JSON.stringify({ effects: true }) }] }] };

async function startFight(page: Page): Promise<void> {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('player-hand')).toBeVisible();
}

async function handTransforms(page: Page): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < 3; i++) {
    out.push(await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="player-hand"] .feel')!).transform));
    await page.waitForTimeout(450);
  }
  return out;
}

test('with effects off (the e2e default) the hand does not sway', async ({ page }) => {
  await startFight(page);
  const samples = await handTransforms(page);
  expect(new Set(samples).size).toBe(1);
});

test.describe('effects on', () => {
  test.use({ storageState: EFFECTS_ON });

  test('the hand sways', async ({ page }) => {
    await startFight(page);
    const samples = await handTransforms(page);
    expect(new Set(samples).size).toBeGreaterThan(1);
  });
});

test.describe('effects on but the system asks for reduced motion', () => {
  test.use({ storageState: EFFECTS_ON, reducedMotion: 'reduce' });

  test('the hand stays still', async ({ page }) => {
    await startFight(page);
    const samples = await handTransforms(page);
    expect(new Set(samples).size).toBe(1);
  });
});
```

Run (the three motion tests first, then the whole suite to see the calm default broke nothing):
`npx playwright test e2e/motion.spec.ts --reporter=line` → Expected: 3 passed.
`npx playwright test --reporter=line` → Expected: all pass. (If a test fails only because motion is now off, set effects on for that test with `test.use({ storageState: EFFECTS_ON })`.)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/ui/visualRng.ts apps/web/src/ui/visualRng.test.ts apps/web/src/ui/useMotion.ts apps/web/src/ui/useMotion.test.ts apps/web/src/ui/SettingsContext.tsx apps/web/src/ui/FeelBox.tsx e2e/storage-state.json e2e/motion.spec.ts playwright.config.ts
git commit -m "feat(web): motion layer — visual rng, useMotionEnabled, e2e runs calm by default"
```

---

### Task 3: fps measurement — `summarizeFrames`, `useFps`, `npm run perf`

**Files:**
- Create: `apps/web/src/ui/fpsMeter.ts`, `fpsMeter.test.ts`, `useFps.ts`, `scripts/perf.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `summarizeFrames(deltasMs: readonly number[]): { avg: number; p5: number }`; `useFps(): number` (frames per second, refreshed twice a second); `npm run perf`.

- [ ] **Step 1: Write the failing test**

`apps/web/src/ui/fpsMeter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { summarizeFrames } from './fpsMeter';

describe('summarizeFrames', () => {
  it('reads a steady 60 fps as 60 for both the mean and the slow tail', () => {
    const stats = summarizeFrames(Array.from({ length: 120 }, () => 1000 / 60));
    expect(stats.avg).toBeCloseTo(60, 5);
    expect(stats.p5).toBeCloseTo(60, 5);
  });

  it('the 5th percentile shows the slow frames the mean hides', () => {
    const deltas = [...Array.from({ length: 95 }, () => 10), ...Array.from({ length: 5 }, () => 100)];
    const stats = summarizeFrames(deltas);
    expect(stats.avg).toBeGreaterThan(80);
    expect(stats.p5).toBeCloseTo(10, 5);
  });

  it('is zero without frames and ignores non-positive deltas', () => {
    expect(summarizeFrames([])).toEqual({ avg: 0, p5: 0 });
    expect(summarizeFrames([0, -4])).toEqual({ avg: 0, p5: 0 });
  });
});
```

- [ ] **Step 2: Run, must fail**

Run: `npx vitest run apps/web/src/ui/fpsMeter.test.ts`
Expected: FAIL (`Cannot find module './fpsMeter'`).

- [ ] **Step 3: Implement**

`apps/web/src/ui/fpsMeter.ts` (no imports, so Node can load it directly):

```ts
export type FrameStats = { readonly avg: number; readonly p5: number };

/** Frames per second from frame-to-frame times in ms: the mean and the 5th percentile (the slow frames a player feels). */
export function summarizeFrames(deltasMs: readonly number[]): FrameStats {
  const fps = deltasMs.filter((d) => d > 0).map((d) => 1000 / d).sort((a, b) => a - b);
  if (fps.length === 0) return { avg: 0, p5: 0 };
  const avg = fps.reduce((sum, v) => sum + v, 0) / fps.length;
  const p5 = fps[Math.max(0, Math.ceil(fps.length * 0.05) - 1)] ?? 0;
  return { avg, p5 };
}
```

`apps/web/src/ui/useFps.ts`:

```ts
import { useEffect, useState } from 'react';
import { summarizeFrames } from './fpsMeter';

const WINDOW = 60;
const REFRESH_MS = 500;

/** Average frames per second over the last second, for the lab's badge. */
export function useFps(): number {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let last = performance.now();
    let frame = 0;
    let shownAt = last;
    const deltas: number[] = [];
    const tick = (now: number): void => {
      deltas.push(now - last);
      if (deltas.length > WINDOW) deltas.shift();
      last = now;
      if (now - shownAt >= REFRESH_MS) {
        shownAt = now;
        setFps(Math.round(summarizeFrames(deltas).avg));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return fps;
}
```

- [ ] **Step 4: Run the unit test**

Run: `npx vitest run apps/web/src/ui/fpsMeter.test.ts && npx tsc --noEmit -p .`
Expected: PASS, no type errors.

- [ ] **Step 5: The perf script**

`scripts/perf.mjs`:

```js
// Rough frame-rate check: a fight with 5 jokers and a full hand on a Pixel 7 profile, CPU slowed ×4.
// Needs the built app served first:  npm run build && npm run preview -w @game/web -- --port 4173
// Usage: npm run perf     (PERF_URL overrides the address). It reports, it never fails: the real check is on a phone.
import { chromium, devices } from '@playwright/test';
import { summarizeFrames } from '../apps/web/src/ui/fpsMeter.ts';

const URL = process.env.PERF_URL ?? 'http://localhost:4173';
const SAMPLE_MS = 5000;
const TARGET_FPS = 55;

const run = {
  seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['hearts', 'looter', 'small', 'rage', 'mirror'], collected: 0, profile: {}, focuses: [],
  bosses: ['general', 'witch'],
  phase: { kind: 'shop', shop: { items: [null, null], packs: [null, null], rerollCost: 2, opened: null, casting: null }, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } },
};

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Pixel 7'] });
const page = await context.newPage();
await page.goto(URL);
await page.evaluate((saved) => {
  localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run: saved }));
  localStorage.setItem('thegame.settings', JSON.stringify({ effects: true }));
}, run);
await page.reload();
await page.getByRole('button', { name: 'Продолжить забег' }).click();
await page.getByRole('button', { name: /Следующий бой/ }).click();
await page.getByTestId('player-hand').waitFor();

const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

const sampling = page.evaluate(
  (ms) =>
    new Promise((resolve) => {
      const deltas = [];
      let last = performance.now();
      const end = last + ms;
      const tick = (now) => {
        deltas.push(now - last);
        last = now;
        if (now < end) requestAnimationFrame(tick);
        else resolve(deltas);
      };
      requestAnimationFrame(tick);
    }),
  SAMPLE_MS,
);
// Move over the hand while sampling, so the tilt and the lift are part of the measurement.
const box = await page.getByTestId('player-hand').boundingBox();
const started = Date.now();
while (box && Date.now() - started < SAMPLE_MS) {
  const t = (Date.now() - started) / 700;
  await page.mouse.move(box.x + box.width * (0.5 + 0.4 * Math.sin(t)), box.y + box.height * 0.6);
  await page.waitForTimeout(40);
}
const stats = summarizeFrames(await sampling);
console.log(`fps (CPU ×4): avg ${stats.avg.toFixed(1)}, 5th percentile ${stats.p5.toFixed(1)} — ${stats.p5 >= TARGET_FPS ? 'OK' : `below ${TARGET_FPS}`}`);
await browser.close();
```

`package.json` `scripts`: add `"perf": "node scripts/perf.mjs"`.

Run: `npm run build >/dev/null && (npm run preview -w @game/web -- --port 4173 --strictPort >/dev/null 2>&1 &) ; sleep 4; npm run perf; pkill -f "vite preview" || true`
Expected: one line `fps (CPU ×4): avg … , 5th percentile … — …`. (If Node refuses to load the `.ts` import, run it with `node --experimental-strip-types scripts/perf.mjs` and put that in the npm script.)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/ui/fpsMeter.ts apps/web/src/ui/fpsMeter.test.ts apps/web/src/ui/useFps.ts scripts/perf.mjs package.json
git commit -m "feat(web): fps measurement — summarizeFrames, useFps, npm run perf"
```

---

### Task 4: Coin and icons pre-shrunk by a whole factor

**Files:**
- Modify: `apps/web/src/ui/pixel/sheet.ts`, `sheet.test.ts`, `uiArt.ts`, `cardArt.ts`, `apps/web/src/ui/SuitMark.tsx`, `apps/web/src/ui/theme.css`, `apps/web/src/lab/lab.css`
- Create: `e2e/layout.spec.ts`

**Interfaces:**
- Produces: `shrinkBy(src: Pixels, factor: number): Pixels`, `padToBox(src: Pixels, side: number): Pixels`. Icons become 18×18 px images, the coin 19×19, suit marks 22×22; CSS shows them at exactly those sizes.

- [ ] **Step 1: Write the failing tests**

Add to `apps/web/src/ui/pixel/sheet.test.ts` (import `padToBox, shrinkBy` in the existing `./sheet` import):

```ts
describe('shrinkBy', () => {
  it('shrinks by a whole factor and returns the same image for factor 1', () => {
    const src = coords(8, 4);
    const out = shrinkBy(src, 2);
    expect([out.w, out.h]).toEqual([4, 2]);
    expect(shrinkBy(src, 1)).toBe(src);
  });
});

describe('padToBox', () => {
  it('centres the image on a transparent square of exactly the given side', () => {
    const src: Pixels = { w: 4, h: 2, data: new Uint8ClampedArray(4 * 2 * 4).fill(255) };
    const out = padToBox(src, 6);
    expect([out.w, out.h]).toEqual([6, 6]);
    expect(Array.from(out.data.subarray(0, 4))).toEqual([0, 0, 0, 0]);
    expect(Array.from(out.data.subarray((2 * 6 + 1) * 4, (2 * 6 + 1) * 4 + 4))).toEqual([255, 255, 255, 255]);
  });

  it('refuses an image that does not fit', () => {
    expect(() => padToBox(coords(7, 2), 6)).toThrow();
  });
});
```

- [ ] **Step 2: Run, must fail**

Run: `npx vitest run apps/web/src/ui/pixel/sheet.test.ts`
Expected: FAIL (`shrinkBy is not a function`).

- [ ] **Step 3: Implement the helpers**

In `apps/web/src/ui/pixel/sheet.ts`, after `padSquare`:

```ts
/** Shrinks by a whole factor (most common colour per cell), so a sprite can be shown ×1 with hard pixels. */
export function shrinkBy(src: Pixels, factor: number): Pixels {
  if (factor <= 1) return src;
  return downscale(src, Math.max(1, Math.floor(src.w / factor)), Math.max(1, Math.floor(src.h / factor)));
}

/** Centres the image on a transparent square of exactly `side` px; the image must fit. */
export function padToBox(src: Pixels, side: number): Pixels {
  if (src.w > side || src.h > side) throw new Error(`padToBox: ${src.w}×${src.h} does not fit ${side}×${side}`);
  const empty: Pixels = { w: side, h: side, data: new Uint8ClampedArray(side * side * 4) };
  return overlay(empty, src, Math.floor((side - src.w) / 2), Math.floor((side - src.h) / 2));
}
```

- [ ] **Step 4: Run, must pass**

Run: `npx vitest run apps/web/src/ui/pixel/sheet.test.ts`
Expected: PASS.

- [ ] **Step 5: Use them in `uiArt.ts` and `cardArt.ts`**

`apps/web/src/ui/pixel/uiArt.ts`: import `padToBox, shrinkBy` from `./sheet`; replace `squareUrl` and the icon conversion:

```ts
/** Every icon sits in a 72 px box and is shrunk ×4 → 18 px; the coin sits in 57 px and is shrunk ×3 → 19 px. */
const ICON_BOX = 72;
const ICON_SHRINK = 4;
const COIN_BOX = 57;
const COIN_SHRINK = 3;

const coinUrlOf = (sheet: Pixels, frame: Rect): string => pixelsToUrl(shrinkBy(padToBox(crop(sheet, frame), COIN_BOX), COIN_SHRINK));
```

Use `coinUrlOf` for `face/red/grey/plate` and the six `spin` frames (replacing `squareUrl`), and in `loadIcons` replace the `pixelsToUrl(padSquare(trimToContent(crop(pixels, frame))))` with `pixelsToUrl(shrinkBy(padToBox(trimToContent(crop(pixels, frame)), ICON_BOX), ICON_SHRINK))`. Remove the now unused `padSquare` import if nothing else uses it.

`apps/web/src/ui/pixel/cardArt.ts`: the suit mark stays native: change `suitMarkUrls = Object.fromEntries(SUITS.map((suit) => [suit, pixelsToUrl(crop(small, SUIT_FRAMES.mark[suit]))]));` to wrap `padToBox(crop(small, SUIT_FRAMES.mark[suit]), 22)` (import `padToBox`).

`apps/web/src/ui/SuitMark.tsx`: change `className="icon"` to `className="icon icon--mark"`.

`apps/web/src/ui/theme.css`: replace the last block (coin and icons) with

```css
/* ---------- coin and icons: pre-shrunk by a whole factor (coin 19 px, icon 18 px, suit sign 22 px), shown ×1 ---------- */
.coin, .icon { display: inline-block; vertical-align: -4px; image-rendering: pixelated; }
.coin { width: 19px; height: 19px; }
.icon { width: 18px; height: 18px; }
.icon--mark { width: 22px; height: 22px; vertical-align: -5px; }
```

`apps/web/src/lab/lab.css`: replace the `.uilab__spin`, `.uilab__big` and `.uilab__big .coin, .uilab__big .icon` rules with:

```css
.uilab__spin { width: 57px; height: 57px; image-rendering: pixelated; }
.uilab__big { display: inline-flex; }
.uilab__big .coin { width: 57px; height: 57px; }
.uilab__big .icon { width: 54px; height: 54px; }
```

- [ ] **Step 6: e2e — sizes are whole**

Create `e2e/layout.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';

async function startFight(page: Page): Promise<void> {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('player-hand')).toBeVisible();
}

test('the coin and the icons show at their pre-shrunk size, so every pixel is a whole pixel', async ({ page }) => {
  await startFight(page);
  await expect(page.locator('.stats .coin').first()).toBeVisible();
  const sizes = await page.evaluate(() => {
    const read = (selector: string) => {
      const img = document.querySelector<HTMLImageElement>(selector);
      return img ? { natural: img.naturalWidth, shown: Math.round(img.getBoundingClientRect().width) } : null;
    };
    return { coin: read('.stats .coin'), icon: read('.hp .icon') };
  });
  expect(sizes.coin).toEqual({ natural: 19, shown: 19 });
  expect(sizes.icon).toEqual({ natural: 18, shown: 18 });
});
```

Run: `npx playwright test e2e/layout.spec.ts --reporter=line`
Expected: 1 passed. Then the full suite `npx playwright test --reporter=line` all green and `npx vitest run` green.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/ui/pixel apps/web/src/ui/SuitMark.tsx apps/web/src/ui/theme.css apps/web/src/lab/lab.css e2e/layout.spec.ts
git commit -m "feat(web): coin and icons pre-shrunk by a whole factor and shown ×1 pixelated"
```

---

### Task 5: The hand as a spring-driven fan

**Files:**
- Modify: `apps/web/src/ui/fan.ts`, `apps/web/src/ui/fan.test.ts`, `apps/web/src/games/durak/FightHands.tsx`, `apps/web/src/games/durak/fight.css`
- Create: `apps/web/src/ui/useElementWidth.ts`, `apps/web/src/ui/useFan.ts`, `e2e/hand.spec.ts`

**Interfaces:**
- Consumes: `useMotionEnabled` (Task 2), existing `fanAngle`, `fanDrop`.
- Produces: `type FanSlot = { x: number; y: number; angle: number }`; `handLayout(count: number, width: number, cardWidth: number, gap?: number): readonly FanSlot[]`; `useElementWidth<T extends HTMLElement>(): readonly [RefObject<T | null>, number]`; `useFan(count: number, rotate: boolean): { containerRef; probeRef; motion: boolean; slotStyle(index: number): CSSProperties }`.

- [ ] **Step 1: Write the failing tests**

Append to `apps/web/src/ui/fan.test.ts` (add `handLayout` to the import):

```ts
describe('handLayout', () => {
  const WIDTHS = [200, 396, 700];
  const CARD = 64;

  it('is empty for no cards and centred for one', () => {
    expect(handLayout(0, 396, CARD)).toEqual([]);
    expect(handLayout(1, 396, CARD)).toEqual([{ x: 0, y: 0, angle: 0 }]);
  });

  it('keeps every card inside the container for 1…12 cards on narrow and wide hands', () => {
    for (const width of WIDTHS) {
      for (let count = 1; count <= 12; count++) {
        const slots = handLayout(count, width, CARD);
        expect(slots).toHaveLength(count);
        for (const slot of slots) {
          expect(Number.isFinite(slot.x) && Number.isFinite(slot.y) && Number.isFinite(slot.angle)).toBe(true);
          expect(Math.abs(slot.x) + CARD / 2).toBeLessThanOrEqual(width / 2 + 0.001);
        }
      }
    }
  });

  it('is symmetric, left to right, and lets cards touch with a small gap when they fit', () => {
    const slots = handLayout(5, 700, CARD);
    expect(slots[0]?.x).toBeCloseTo(-(slots[4]?.x ?? 0));
    for (let i = 1; i < slots.length; i++) expect(slots[i]!.x).toBeGreaterThan(slots[i - 1]!.x);
    expect(slots[1]!.x - slots[0]!.x).toBeCloseTo(CARD + 4);
  });

  it('overlaps more as the hand grows on a fixed width', () => {
    const six = handLayout(6, 396, 74);
    const ten = handLayout(10, 396, 74);
    expect(six[1]!.x - six[0]!.x).toBeGreaterThan(ten[1]!.x - ten[0]!.x);
  });

  it('stacks the cards instead of producing NaN while the container is not measured yet', () => {
    const slots = handLayout(3, 0, 0);
    expect(slots.every((s) => s.x === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run, must fail**

Run: `npx vitest run apps/web/src/ui/fan.test.ts`
Expected: FAIL (`handLayout is not a function`).

- [ ] **Step 3: Implement `handLayout`**

Append to `apps/web/src/ui/fan.ts`:

```ts
export type FanSlot = { readonly x: number; readonly y: number; readonly angle: number };

/** Room kept at each end for the rotation of the outer cards, as a fraction of a card width. */
const ROTATION_ROOM = 0.15;

/**
 * Where each card of a hand sits relative to the middle of the hand: `x` px from the centre, `y` px down, `angle` degrees.
 * Cards keep a small gap when they fit and overlap just enough to stay inside `width` when they do not.
 */
export function handLayout(count: number, width: number, cardWidth: number, gap = 4): readonly FanSlot[] {
  if (count <= 0) return [];
  const room = Math.max(0, width - cardWidth - cardWidth * ROTATION_ROOM * 2);
  const step = count <= 1 ? 0 : Math.min(cardWidth + gap, room / (count - 1));
  return Array.from({ length: count }, (_, i) => ({ x: (i - (count - 1) / 2) * step, y: fanDrop(i, count), angle: fanAngle(i, count) }));
}
```

Run: `npx vitest run apps/web/src/ui/fan.test.ts` → Expected: PASS.

- [ ] **Step 4: The measuring hook and `useFan`**

`apps/web/src/ui/useElementWidth.ts`:

```ts
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** The element's content width in px, kept up to date; 0 until it has been measured. */
export function useElementWidth<T extends HTMLElement>(): readonly [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    setWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
```

`apps/web/src/ui/useFan.ts`:

```ts
import type { CSSProperties, RefObject } from 'react';
import { handLayout } from './fan';
import { useElementWidth } from './useElementWidth';
import { useMotionEnabled } from './useMotion';

export type Fan = {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  /** An invisible element as wide as a card (`--card-w`), so the layout knows the real card width in px. */
  readonly probeRef: RefObject<HTMLSpanElement | null>;
  readonly motion: boolean;
  readonly slotStyle: (index: number) => CSSProperties;
};

/** Per-slot styles for a hand: positions come from `handLayout` and move only through `transform`. */
export function useFan(count: number, rotate: boolean): Fan {
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const [probeRef, cardWidth] = useElementWidth<HTMLSpanElement>();
  const motion = useMotionEnabled();
  const slots = handLayout(count, width, cardWidth);
  const measured = width > 0 && cardWidth > 0;
  const slotStyle = (index: number): CSSProperties => {
    const slot = slots[index];
    const x = Math.round(slot?.x ?? 0);
    const y = rotate ? (slot?.y ?? 0) : 0;
    const angle = rotate ? (slot?.angle ?? 0) : 0;
    return { transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`, visibility: measured ? undefined : 'hidden', ['--z' as string]: index };
  };
  return { containerRef, probeRef, motion, slotStyle };
}
```

- [ ] **Step 5: Use it in the hands**

In `apps/web/src/games/durak/FightHands.tsx`: delete `HAND_FIT`, `slotStyle` and the `handOverlap`/`fanAngle`/`fanDrop` import; add `import { useFan } from '../../ui/useFan';`. Replace `EnemyHand` and the `return` of `PlayerHand`:

```tsx
export function EnemyHand({ cards, revealed = false }: { readonly cards: readonly Card[]; readonly revealed?: boolean }) {
  const fan = useFan(cards.length, false);
  return (
    <div ref={fan.containerRef} className="hand hand--enemy" data-testid="enemy-hand" data-motion={fan.motion ? 'on' : 'off'} data-revealed={revealed ? 'true' : undefined}>
      <span ref={fan.probeRef} className="hand__probe" aria-hidden="true" />
      {cards.map((card, index) => (
        <div key={card.id} className="hand__slot" style={fan.slotStyle(index)}>
          {revealed ? <CardView card={card} /> : <CardBack layoutId={card.id} />}
        </div>
      ))}
      <span className="hand__count">{cards.length}</span>
    </div>
  );
}
```

In `PlayerHand` compute `const cards = sortHand(round.hands.player, sort, (card) => isRoundTrump(round, card)); const fan = useFan(cards.length, true);` before the `return`, and make the root

```tsx
    <div ref={fan.containerRef} className={myTurn ? 'hand hand--player' : 'hand hand--player hand--waiting'} data-testid="player-hand" data-motion={fan.motion ? 'on' : 'off'}>
      <span ref={fan.probeRef} className="hand__probe" aria-hidden="true" />
      {cards.map((card, index) => {
```
(the body of the map stays, with `style={slotStyle(index, all.length, true)}` replaced by `style={fan.slotStyle(index)}` and `all` no longer needed).

`apps/web/src/games/durak/fight.css`: replace the `.hand` and `.hand__slot` rules (lines 32–33) with:

```css
/* The hand: slots are positioned with transform only (see useFan), so a re-layout springs instead of jumping. */
.hand { --slot-w: var(--card-w); position: relative; height: calc(var(--card-w) * 1.5); }
.hand__probe { position: absolute; left: 0; top: 0; width: var(--card-w); height: 0; visibility: hidden; pointer-events: none; }
.hand__slot {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: var(--slot-w);
  margin-left: calc(var(--slot-w) / -2);
  z-index: var(--z, 0);
  transform-origin: 50% 120%;
  transition: transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.15), translate 0.12s ease-out;
}
.hand[data-motion='off'] .hand__slot { transition: none; }
.hand--player .hand__slot:hover { z-index: 100; translate: 0 -12px; }
.hand[data-motion='off'] .hand__slot:hover { translate: none; }
.hand__count { position: absolute; right: 0; top: 50%; translate: 0 -50%; font-family: var(--font-head); font-size: 0.7em; opacity: 0.8; }
```
and delete the old `.hand__count {…}` rule (the one with `align-self:center; margin-left: 8px`). Keep `.hand--enemy` sizing lines as they are for now (Task 6 changes them).

- [ ] **Step 6: e2e**

Create `e2e/hand.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';

const EFFECTS_ON = { cookies: [], origins: [{ origin: 'http://localhost:4173', localStorage: [{ name: 'thegame.settings', value: JSON.stringify({ effects: true, sway: false }) }] }] };

async function startFight(page: Page): Promise<void> {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('player-hand').locator('.hand__slot').first()).toBeVisible();
}

async function cardBoxes(page: Page) {
  return page.getByTestId('player-hand').locator('.hand__slot .card').evaluateAll((cards) => cards.map((c) => c.getBoundingClientRect().toJSON()));
}

test('every card of the hand stays on screen', async ({ page }) => {
  await startFight(page);
  const width = page.viewportSize()?.width ?? 0;
  for (const box of await cardBoxes(page)) {
    expect(box.left).toBeGreaterThanOrEqual(-1);
    expect(box.right).toBeLessThanOrEqual(width + 1);
  }
});

test('after a card is played the rest of the hand is re-laid out and still on screen and tappable', async ({ page }) => {
  await startFight(page);
  // If seed 42 does not give the player the first move, wait for the turn the way e2e/durak.spec.ts does before this click.
  const before = await page.getByTestId('player-hand').locator('.hand__slot').count();
  await page.getByTestId('player-hand').locator('.hand__slot').first().click();
  await expect(page.getByTestId('player-hand').locator('.hand__slot')).toHaveCount(before - 1);
  const width = page.viewportSize()?.width ?? 0;
  for (const box of await cardBoxes(page)) {
    expect(box.left).toBeGreaterThanOrEqual(-1);
    expect(box.right).toBeLessThanOrEqual(width + 1);
  }
});

test.describe('effects on', () => {
  test.use({ storageState: EFFECTS_ON });

  test('a card under the pointer lifts above its neighbours', async ({ page }) => {
    await startFight(page);
    const slot = page.getByTestId('player-hand').locator('.hand__slot').nth(2);
    const before = (await slot.boundingBox())!.y;
    await slot.hover();
    await expect.poll(async () => (await slot.boundingBox())!.y, { timeout: 2000 }).toBeLessThan(before - 6);
  });
});
```

Run: `npx playwright test e2e/hand.spec.ts --reporter=line`
Expected: 3 passed. Then the whole `npx playwright test --reporter=line`: all pass (fix selectors in older tests only if they relied on the hand being a flex row; `.hand__slot` order and `[data-testid=player-hand]` are unchanged).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/ui/fan.ts apps/web/src/ui/fan.test.ts apps/web/src/ui/useElementWidth.ts apps/web/src/ui/useFan.ts apps/web/src/games/durak/FightHands.tsx apps/web/src/games/durak/fight.css e2e/hand.spec.ts
git commit -m "feat(web): the hand is a spring-driven fan laid out from the measured width"
```

---

### Task 6: Whole-number card scale and the height budget

**Files:**
- Modify: `apps/web/src/games/durak/fight.css`, `e2e/layout.spec.ts`

**Interfaces:**
- Consumes: the hand from Task 5.
- Produces: in a fight, `--card-w` is exactly `74px` on portrait phones at least 396 px wide and 780 px tall; in landscape a whole multiple of 74 px when the fit allows, otherwise the old fractional fit.

- [ ] **Step 1: Write the failing e2e**

Append to `e2e/layout.spec.ts`:

```ts
const BIG = { storageState: { cookies: [], origins: [{ origin: 'http://localhost:4173', localStorage: [{ name: 'thegame.settings', value: '{"effects":false}' }] }] } };

async function fightWith(page: Page, patch: object): Promise<void> {
  const run = {
    seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['looter', 'small'], collected: 0, profile: {}, focuses: ['boost', 'peek'],
    bosses: ['general', 'witch'],
    phase: { kind: 'shop', shop: { items: [null, null], packs: [null, null], rerollCost: 2, opened: null, casting: null }, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } },
    ...patch,
  };
  await page.goto('/');
  await page.evaluate((saved) => localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run: saved })), run);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByRole('button', { name: /Следующий бой/ }).click();
  await expect(page.getByTestId('player-hand')).toBeVisible();
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
const cardWidth = (page: Page) => page.locator('[data-testid="player-hand"] .card').first().evaluate((el) => el.getBoundingClientRect().width);

test.describe('Pixel 7 portrait (412×915)', () => {
  test.use({ ...BIG, viewport: { width: 412, height: 915 } });

  test('cards are exactly 74 px (×1) and the whole fight fits without scrolling', async ({ page }) => {
    await fightWith(page, {});
    expect(Math.round(await cardWidth(page))).toBe(74);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('short portrait (375×667)', () => {
  test.use({ ...BIG, viewport: { width: 375, height: 667 } });

  test('keeps the reduced card size and still fits without scrolling', async ({ page }) => {
    await fightWith(page, {});
    expect(await cardWidth(page)).toBeLessThan(74);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('desktop (1280×800)', () => {
  test.use({ ...BIG, viewport: { width: 1280, height: 800 } });

  test('cards are a whole multiple of 74 px', async ({ page }) => {
    await fightWith(page, {});
    expect(Math.round(await cardWidth(page)) % 74).toBe(0);
  });
});
```

Run: `npx playwright test e2e/layout.spec.ts --reporter=line`
Expected: the 412×915 and 1280×800 tests FAIL (card width ≈ 57 px / not a multiple of 74); the 375×667 test passes.

- [ ] **Step 2: Pin the card scale**

In `apps/web/src/games/durak/fight.css`, change the landscape block's `--card-w` line (`.fight { --card-w: clamp(44px, min(13vh, 8.5vw), 150px); ...`) to a whole multiple of 74 px when the fit reaches 74, the old fractional fit otherwise:

```css
    --card-fit: clamp(44px, min(13vh, 8.5vw), 150px);
    --card-w: max(round(down, var(--card-fit), 74px), min(var(--card-fit), 73px));
```

and append this block at the end of the file (after the base `.fight` rules):

```css
/* Portrait phones tall enough: the 74×104 card art at exactly ×1 (a whole-number scale). */
@media (max-aspect-ratio: 5/4) and (min-height: 780px) and (min-width: 396px) {
  .fight { --card-w: 74px; }
}

/* The enemy hand shows the top of the backs only (their corners are what matters), so ×1 costs little height. */
.hand--enemy { --slot-w: var(--card-w); height: calc(var(--card-w) * 0.55); overflow: hidden; }
.hand--enemy .hand__slot { top: 0; bottom: auto; transform-origin: 50% 0; }
.hand--enemy .card { width: var(--card-w); }
```
Delete the two old rules `.hand--enemy { --slot-w: calc(var(--card-w) * 0.6); min-height: calc(var(--card-w) * 0.9); }` and `.hand--enemy .card { width: calc(var(--card-w) * 0.6); }`.

- [ ] **Step 3: Measure; apply the levers in order until the 412×915 test passes**

Run: `npx playwright test e2e/layout.spec.ts --reporter=line`. If the 412×915 test still fails on the overflow check, add these levers one at a time into a new block `@media (max-aspect-ratio: 5/4) and (min-height: 780px) and (min-width: 396px) { … }` and re-run after each:

1. `.fight { gap: 6px 8px; }`
2. `.jokers__head { display: none; }`
3. `.fight .run-header { padding: 6px 10px; gap: 2px; }`
4. `.fight .stats__tile { padding-block: 3px; }`

**Stop condition:** if the test still fails after lever 4, remove the `--card-w: 74px` rule from the portrait block, keep the levers out, mark the 412×915 test `test.fixme` with the measured overflow in the title, and report to the owner (spec §10.1: ×1 then turns on only from a taller screen). Do not go on with a design the owner has not seen.

Expected after the levers (or the fallback): `layout.spec.ts` passes; `npx playwright test --reporter=line` all green (`e2e/focuses.spec.ts` short-screen tests must still pass).

- [ ] **Step 4: Look at it**

Open the dev server (`npm run dev`) at 412×915 and 915×412 and 1280×800 and check by eye: the hand fan, the enemy backs peeking, the table, the revealed enemy hand (play Подглядывание: the rank and suit corners must be readable in the peeking strip). Fix only what is plainly broken.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/games/durak/fight.css e2e/layout.spec.ts
git commit -m "feat(web): whole-number card scale (74 px on tall phones), enemy hand peeks"
```

---

### Task 7: Shared tilt — `tiltAngles` and the tilt on jokers and shop goods

**Files:**
- Create: `apps/web/src/ui/tilt.ts`, `tilt.test.ts`
- Modify: `apps/web/src/ui/FeelBox.tsx`, `apps/web/src/games/durak/JokerPanel.tsx`, `apps/web/src/games/durak/shop/ShopSlot.tsx`, `apps/web/src/games/durak/shop/OwnedJokers.tsx`, `apps/web/src/games/durak/shop/OwnedFocuses.tsx`, `apps/web/src/ui/theme.css`, `e2e/motion.spec.ts`

**Interfaces:**
- Produces: `tiltAngles(x: number, y: number, rect: { left: number; top: number; width: number; height: number }, tilt: number): { rotateX: number; rotateY: number }`.

- [ ] **Step 1: Write the failing test**

`apps/web/src/ui/tilt.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { tiltAngles } from './tilt';

const RECT = { left: 100, top: 200, width: 60, height: 80 };

describe('tiltAngles', () => {
  it('is flat in the middle', () => {
    const flat = tiltAngles(130, 240, RECT, 16);
    expect(flat.rotateX).toBeCloseTo(0);
    expect(flat.rotateY).toBeCloseTo(0);
  });

  it('leans towards the pointer: right edge → positive rotateY, top edge → positive rotateX', () => {
    expect(tiltAngles(160, 240, RECT, 16).rotateY).toBeCloseTo(8);
    expect(tiltAngles(130, 200, RECT, 16).rotateX).toBeCloseTo(8);
  });

  it('never leans past ±tilt/2, even when the finger is dragged far off the element', () => {
    const far = tiltAngles(5000, -5000, RECT, 16);
    expect(far.rotateY).toBeCloseTo(8);
    expect(far.rotateX).toBeCloseTo(8);
    expect(Math.abs(tiltAngles(-900, 900, RECT, 16).rotateY)).toBeCloseTo(8);
  });

  it('is flat for an element with no size instead of NaN', () => {
    const none = tiltAngles(10, 10, { left: 0, top: 0, width: 0, height: 0 }, 16);
    expect(none.rotateX).toBeCloseTo(0);
    expect(none.rotateY).toBeCloseTo(0);
  });
});
```

- [ ] **Step 2: Run, must fail**

Run: `npx vitest run apps/web/src/ui/tilt.test.ts`
Expected: FAIL (`Cannot find module './tilt'`).

- [ ] **Step 3: Implement and use in `FeelBox`**

`apps/web/src/ui/tilt.ts`:

```ts
type Rect = { readonly left: number; readonly top: number; readonly width: number; readonly height: number };

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** How far a card leans towards a pointer: the card tilts to ±tilt/2 at its edges and no further, however far off the pointer is. */
export function tiltAngles(x: number, y: number, rect: Rect, tilt: number): { rotateX: number; rotateY: number } {
  if (rect.width <= 0 || rect.height <= 0) return { rotateX: 0, rotateY: 0 };
  const fx = clamp((x - rect.left) / rect.width - 0.5, -0.5, 0.5);
  const fy = clamp((y - rect.top) / rect.height - 0.5, -0.5, 0.5);
  return { rotateX: -fy * tilt, rotateY: fx * tilt };
}
```

In `FeelBox.tsx` import `tiltAngles` and replace the body of `onMove` after the `rect` guard with:

```tsx
    const { rotateX: x, rotateY: y } = tiltAngles(event.clientX, event.clientY, rect, feel.tilt);
    rotateX.set(x);
    rotateY.set(y);
```
Add `onPointerUp={onLeave}` and `onPointerCancel={onLeave}` to the `feel__tilt` element (next to `onPointerLeave`).

`apps/web/src/ui/theme.css`: add a rule `.feel__tilt { touch-action: manipulation; }` (a finger on a card does not start a page zoom or a double-tap delay, while scrolling still works).

- [ ] **Step 4: Run, must pass**

Run: `npx vitest run apps/web/src/ui/tilt.test.ts && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Wrap jokers and shop goods in `FeelBox`**

- `JokerPanel.tsx`: `import { FeelBox } from '../../ui/FeelBox';` and in `JokerSlot` wrap the face: `<FeelBox><JokerFace id={id} badge={badge} /></FeelBox>` inside the `jslot__button`.
- `ShopSlot.tsx`: `import { FeelBox } from '../../../ui/FeelBox';` and wrap `{children}` inside `shop-slot__face` as `<FeelBox>{children}</FeelBox>`.
- `OwnedJokers.tsx`: wrap `<JokerFace id={id} />` as `<FeelBox><JokerFace id={id} /></FeelBox>` (import path `'../../../ui/FeelBox'`).
- `OwnedFocuses.tsx`: wrap `<PackCardFace card={{ kind: 'focus', focusId: id }} />` the same way.
- In `theme.css` add `.jslot .feel, .owned__card .feel, .shop-slot__face .feel { width: auto; height: auto; }` if the wrapped faces collapse or stretch (check in the browser: sizes of jokers and shop cards must be unchanged).

- [ ] **Step 6: e2e — hover tilts a joker only when effects are on**

Append to `e2e/motion.spec.ts`:

```ts
async function jokerTilt(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.querySelector('.jslot .feel__tilt')!).transform);
}

async function fightWithJoker(page: Page): Promise<void> {
  const run = {
    seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['looter'], collected: 0, profile: {}, focuses: [], bosses: ['general', 'witch'],
    phase: { kind: 'shop', shop: { items: [null, null], packs: [null, null], rerollCost: 2, opened: null, casting: null }, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } },
  };
  await page.goto('/');
  await page.evaluate((saved) => localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run: saved })), run);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByRole('button', { name: /Следующий бой/ }).click();
  await expect(page.locator('.jslot .feel__tilt')).toBeVisible();
}

test('with effects off a joker does not tilt under the pointer', async ({ page }) => {
  await fightWithJoker(page);
  const box = (await page.locator('.jslot').first().boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
  await page.waitForTimeout(300);
  expect(await jokerTilt(page)).toBe('none');
});

test.describe('effects on: tilt', () => {
  test.use({ storageState: EFFECTS_ON });

  test('a joker tilts towards the pointer and comes back when it leaves', async ({ page }) => {
    await fightWithJoker(page);
    const box = (await page.locator('.jslot').first().boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
    await expect.poll(() => jokerTilt(page), { timeout: 2000 }).not.toBe('none');
    await page.mouse.move(5, 5);
    await expect.poll(() => jokerTilt(page), { timeout: 2000 }).toMatch(/^(none|matrix3d\(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1\))$/);
  });
});
```

Run: `npx playwright test e2e/motion.spec.ts --reporter=line`
Expected: all pass. Then `npx vitest run` and the whole `npx playwright test --reporter=line` green.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/ui/tilt.ts apps/web/src/ui/tilt.test.ts apps/web/src/ui/FeelBox.tsx apps/web/src/ui/theme.css apps/web/src/games/durak/JokerPanel.tsx apps/web/src/games/durak/shop e2e/motion.spec.ts
git commit -m "feat(web): shared tilt — jokers and shop goods lean towards the pointer"
```

---

### Task 8: Idle sway for jokers, still while a hit is being scored

**Files:**
- Modify: `apps/web/src/games/durak/JokerPanel.tsx`, `apps/web/src/games/durak/DurakFightScreen.tsx`, `e2e/motion.spec.ts`

**Interfaces:**
- Consumes: `swayPhases` (Task 2), `SWAY_SECONDS` and `FeelBox` (Task 2/7).
- Produces: `JokerPanel` takes `idle: boolean`; `PlayerHand` keeps its `sway` prop.

- [ ] **Step 1: Write the failing e2e**

Append to `e2e/motion.spec.ts`, inside the existing `test.describe('effects on', …)` block of Task 2:

```ts
  test('jokers sway on their own, each with its own phase', async ({ page }) => {
    const run = {
      seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['looter', 'small', 'rage'], collected: 0, profile: {}, focuses: [], bosses: ['general', 'witch'],
      phase: { kind: 'shop', shop: { items: [null, null], packs: [null, null], rerollCost: 2, opened: null, casting: null }, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } },
    };
    await page.goto('/');
    await page.evaluate((saved) => localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run: saved })), run);
    await page.reload();
    await page.getByRole('button', { name: 'Продолжить забег' }).click();
    await page.getByRole('button', { name: /Следующий бой/ }).click();
    const read = () => page.evaluate(() => [...document.querySelectorAll('.jslot .feel')].map((el) => getComputedStyle(el).transform));
    await expect(page.locator('.jslot .feel')).toHaveCount(3);
    const a = await read();
    await page.waitForTimeout(700);
    const b = await read();
    expect(b).not.toEqual(a);
    expect(new Set(b).size).toBeGreaterThan(1);
  });
```

Run: `npx playwright test e2e/motion.spec.ts -g "jokers sway" --reporter=line`
Expected: FAIL (jokers do not sway yet).

- [ ] **Step 2: Implement**

`JokerPanel.tsx`: add `import { useState } from 'react';`, `import { SWAY_SECONDS } from '../../ui/FeelBox';`, `import { swayPhases } from '../../ui/visualRng';`. Extend `JokerSlotProps` with `readonly idle: boolean; readonly phase: number;`, take them in `JokerSlot`, and change the wrapper to `<FeelBox idle={idle} swayDelay={phase}>`. In `JokerPanel`:

```tsx
export function JokerPanel({ jokers, state, enemyTakes, idle }: JokerPanelProps) {
  // One phase per slot, drawn once: the visual rng, not the game's.
  const [phases] = useState(() => swayPhases(MAX_JOKERS, SWAY_SECONDS));
  ...
        {jokers.map((id, slot) => (
          <JokerSlot key={id} id={id} slot={slot} badge={jokerBadge(id, state, enemyTakes)} idle={idle} phase={phases[slot] ?? 0} />
        ))}
```
and add `readonly idle: boolean;` to `JokerPanelProps`.

`DurakFightScreen.tsx`: pass `idle={settings.sway && !playback.active}` to `<JokerPanel …>` and change `sway={settings.sway}` on `<PlayerHand>` to `sway={settings.sway && !playback.active}`.

- [ ] **Step 3: Run**

Run: `npx tsc --noEmit -p . && npx playwright test e2e/motion.spec.ts --reporter=line`
Expected: no type errors, all motion tests pass. Then `npx vitest run` and the whole e2e suite green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/games/durak/JokerPanel.tsx apps/web/src/games/durak/DurakFightScreen.tsx e2e/motion.spec.ts
git commit -m "feat(web): jokers sway with their own phase, everything holds still while a hit is scored"
```

---

### Task 9: Thick pixel panels and buttons

**Files:**
- Modify: `apps/web/src/ui/theme.css`, `e2e/layout.spec.ts`

**Interfaces:**
- Produces: CSS tokens `--bevel-light`, `--bevel-dark`, `--inner-shadow`, `--sp-1…--sp-4` on `:root`.

- [ ] **Step 1: Write the failing e2e**

Append to `e2e/layout.spec.ts`:

```ts
test('the thick-panel tokens exist and panels use the 2 px outline', async ({ page }) => {
  await page.goto('/');
  const tokens = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    return ['--bevel-light', '--bevel-dark', '--inner-shadow', '--sp-1', '--sp-2', '--sp-3', '--sp-4'].map((name) => css.getPropertyValue(name).trim());
  });
  expect(tokens.every((value) => value !== '')).toBe(true);
  await page.getByRole('button', { name: 'Настройки' }).click();
  const border = await page.locator('.panel').first().evaluate((el) => getComputedStyle(el).borderTopWidth);
  expect(border).toBe('2px');
});
```

Run: `npx playwright test e2e/layout.spec.ts -g "thick-panel" --reporter=line`
Expected: FAIL (tokens empty).

- [ ] **Step 2: Implement the tokens, the panels, the chips and the buttons**

In `apps/web/src/ui/theme.css`, inside the first `:root { … }` block add:

```css
  /* Thick pixel look: a light bevel top-left, a dark one bottom-right, an inner shadow, one spacing scale. */
  --bevel-light: rgb(255 255 255 / 16%);
  --bevel-dark: rgb(0 0 0 / 35%);
  --inner-shadow: rgb(0 0 0 / 28%);
  --sp-1: 2px;
  --sp-2: 4px;
  --sp-3: 8px;
  --sp-4: 12px;
```

Replace the `.panel` and `.chip` rules with:

```css
.panel {
  padding: var(--sp-3) var(--sp-4);
  border: 2px solid #000000;
  border-radius: 10px;
  background: rgb(27 20 38 / 88%);
  box-shadow: inset 2px 2px 0 var(--bevel-light), inset -2px -2px 0 var(--bevel-dark), 0 5px 0 rgb(0 0 0 / 55%);
  text-shadow: 0 1px 0 rgb(0 0 0 / 70%);
}
.chip {
  display: inline-block;
  padding: var(--sp-1) var(--sp-3);
  border-radius: 6px;
  background: rgb(0 0 0 / 45%);
  box-shadow: inset 1px 1px 0 var(--bevel-light), inset -1px -1px 0 var(--bevel-dark);
  font-size: 0.85rem;
}
```

In the `.pbtn` rule replace `box-shadow: 0 4px 0 var(--d);` with:

```css
  box-shadow: inset 2px 2px 0 var(--bevel-light), inset -2px -3px 0 var(--bevel-dark), 0 4px 0 var(--d);
```

and replace the `.pbtn:active:not(:disabled)` and `.pbtn:disabled` rules with:

```css
.pbtn:active:not(:disabled) { transform: translateY(4px); box-shadow: inset 0 3px 0 var(--inner-shadow), 0 0 0 var(--d); }
.pbtn:disabled { opacity: 0.45; cursor: default; box-shadow: inset 2px 2px 0 var(--bevel-light), inset -2px -3px 0 var(--bevel-dark); transform: none; }
```
Panels that show dark text on a light surface (the card tooltip `.card-tip`, the joker `jface`) already set `text-shadow: none`; check they still do.

- [ ] **Step 3: Run and look**

Run: `npx playwright test --reporter=line` → Expected: all pass (the 2 px outline moves nothing by more than a pixel; `layout.spec.ts` and `focuses.spec.ts` fit checks must stay green). Open the app at 412×915 and check the menu, a fight, the shop and the settings by eye: panels read as thick, a pressed button sinks, a disabled button does not.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/ui/theme.css e2e/layout.spec.ts
git commit -m "feat(web): thick pixel panels and buttons — bevels, inner shadow, spacing scale"
```

---

### Task 10: The «Ощущение» lab stand, screenshots, perf and the stage check

**Files:**
- Create: `apps/web/src/lab/FeelTab.tsx`, `scripts/shots.mjs`
- Modify: `apps/web/src/lab/CardLab.tsx`, `apps/web/src/lab/lab.css`, `.gitignore`

- [ ] **Step 1: The lab stand**

`apps/web/src/lab/FeelTab.tsx`:

```tsx
import { makeCard, type Card } from '@game/core';
import { JOKER_IDS } from '@game/durak';
import { useState } from 'react';
import { CardView } from '../components/CardView';
import { JokerFace } from '../games/durak/JokerFace';
import { FeelBox, SWAY_SECONDS } from '../ui/FeelBox';
import { PixelButton } from '../ui/PixelButton';
import { SettingsProvider, useSettings } from '../ui/SettingsContext';
import { useFan } from '../ui/useFan';
import { useFps } from '../ui/useFps';
import { swayPhases } from '../ui/visualRng';
import '../games/durak/fight.css';

const POOL: readonly Card[] = [
  makeCard('spades', 10), makeCard('clubs', 9), makeCard('diamonds', 13), makeCard('hearts', 7), makeCard('spades', 14), makeCard('clubs', 6),
  makeCard('hearts', 12), makeCard('diamonds', 8), makeCard('spades', 6), makeCard('clubs', 14), makeCard('hearts', 9), makeCard('diamonds', 11),
];
const SHOWN_JOKERS = JOKER_IDS.slice(0, 5);

function FanStand() {
  const [count, setCount] = useState(6);
  const fan = useFan(count, true);
  return (
    <section className="panel feellab__section">
      <h2 className="gallery__title">Веер руки</h2>
      <div className="feellab__buttons">
        <PixelButton tone="blue" small onClick={() => setCount((c) => Math.max(0, c - 1))}>
          − карта
        </PixelButton>
        <PixelButton tone="green" small onClick={() => setCount((c) => Math.min(POOL.length, c + 1))}>
          + карта
        </PixelButton>
        <span>{count}</span>
      </div>
      <div ref={fan.containerRef} className="hand hand--player feellab__hand" data-motion={fan.motion ? 'on' : 'off'}>
        <span ref={fan.probeRef} className="hand__probe" aria-hidden="true" />
        {POOL.slice(0, count).map((card, index) => (
          <div key={card.id} className="hand__slot" style={fan.slotStyle(index)}>
            <CardView card={card} playable idle />
          </div>
        ))}
      </div>
    </section>
  );
}

function JokerStand() {
  const [phases] = useState(() => swayPhases(SHOWN_JOKERS.length, SWAY_SECONDS));
  return (
    <section className="panel feellab__section">
      <h2 className="gallery__title">Джокеры: наклон и покачивание</h2>
      <ul className="feellab__jokers">
        {SHOWN_JOKERS.map((id, i) => (
          <li key={id} style={{ ['--jface-w' as string]: '64px' }}>
            <FeelBox idle swayDelay={phases[i] ?? 0}>
              <JokerFace id={id} />
            </FeelBox>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Controls() {
  const { settings, update } = useSettings();
  const fps = useFps();
  return (
    <section className="panel feellab__section">
      <h2 className="gallery__title">Настройки и fps</h2>
      <label className="settings__row">
        <input type="checkbox" checked={settings.effects} onChange={(event) => update({ effects: event.target.checked })} />
        Эффекты
      </label>
      <label className="settings__row">
        <input type="checkbox" checked={settings.sway} onChange={(event) => update({ sway: event.target.checked })} />
        Покачивание карт
      </label>
      <p className="feellab__fps">{fps} fps</p>
    </section>
  );
}

function ButtonStand() {
  return (
    <section className="panel feellab__section">
      <h2 className="gallery__title">Панели и кнопки</h2>
      <div className="feellab__buttons">
        <PixelButton tone="blue">Обычная</PixelButton>
        <PixelButton tone="red">Красная</PixelButton>
        <PixelButton tone="orange" disabled>
          Недоступна
        </PixelButton>
        <PixelButton tone="green" small>
          Малая
        </PixelButton>
      </div>
      <p>
        <span className="chip">чип</span> <span className="chip">×1.25</span>
      </p>
    </section>
  );
}

/** The stage-1 stand: the fan, the tilt and sway, the thick panels and buttons, the switches and an fps badge. */
export function FeelTab() {
  return (
    <SettingsProvider>
      <div className="jokerlab">
        <Controls />
        <FanStand />
        <JokerStand />
        <ButtonStand />
      </div>
    </SettingsProvider>
  );
}
```

`CardLab.tsx`: add `{ id: 'feel', name: 'Ощущение' },` to `TABS`, `import { FeelTab } from './FeelTab';` and `{tab === 'feel' && <FeelTab />}` next to the other tab renders. `lab.css` append:

```css
/* ---------- feel tab ---------- */
.feellab__section { display: flex; flex-direction: column; gap: 10px; }
.feellab__buttons { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.feellab__hand { --card-w: 64px; width: 100%; }
.feellab__jokers { display: flex; flex-wrap: wrap; gap: 14px; margin: 0; padding: 0; list-style: none; }
.feellab__fps { margin: 0; font-family: var(--font-head); font-size: 1.1rem; }
```
(`PixelButton` props: check `apps/web/src/ui/PixelButton.tsx` accepts `tone`, `small`, `disabled`; adjust the stand to its real API.)

Run: `npx tsc --noEmit -p .` → no errors. Open `?lab` → «Ощущение» at 412×915: the buttons add and remove cards and the fan re-lays out with a spring; jokers tilt under the pointer and sway; toggling «Эффекты» stills everything; the fps badge updates.

- [ ] **Step 2: Screenshots and a recording**

`scripts/shots.mjs`:

```js
// Screenshots and a short screen recording of the stage, for the owner to look at.
// Needs the built app served:  npm run build && npm run preview -w @game/web -- --port 4173
// Writes to .superpowers/shots/juice-1/ (not committed).
import { mkdirSync } from 'node:fs';
import { chromium, devices } from '@playwright/test';

const URL = process.env.SHOTS_URL ?? 'http://localhost:4173';
const OUT = '.superpowers/shots/juice-1';
mkdirSync(OUT, { recursive: true });

const run = {
  seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['hearts', 'looter', 'small', 'rage', 'mirror'], collected: 0, profile: {}, focuses: ['boost', 'peek'],
  bosses: ['general', 'witch'],
  phase: { kind: 'shop', shop: { items: [{ card: { kind: 'joker', jokerId: 'gloat' }, price: 5 }, { card: { kind: 'tarot', tarotId: 'sun' }, price: 3 }], packs: [{ kind: 'focuses', size: 'big', price: 6 }, null], rerollCost: 2, opened: null, casting: null }, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } },
};

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Pixel 7'], recordVideo: { dir: OUT, size: { width: 412, height: 915 } } });
const page = await context.newPage();
await page.goto(URL);
await page.evaluate((saved) => {
  localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run: saved }));
  localStorage.setItem('thegame.settings', JSON.stringify({ effects: true }));
}, run);
await page.reload();
await page.screenshot({ path: `${OUT}/menu.png` });
await page.getByRole('button', { name: 'Продолжить забег' }).click();
await page.screenshot({ path: `${OUT}/shop.png` });
await page.getByRole('button', { name: /Следующий бой/ }).click();
await page.getByTestId('player-hand').waitFor();
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/fight.png` });
const hand = await page.getByTestId('player-hand').boundingBox();
for (let i = 0; i < 40 && hand; i++) {
  await page.mouse.move(hand.x + hand.width * (0.1 + 0.8 * ((i % 20) / 20)), hand.y + hand.height * 0.6);
  await page.waitForTimeout(60);
}
await page.screenshot({ path: `${OUT}/fight-hover.png` });
await page.goto(`${URL}/?lab`);
await page.getByRole('button', { name: 'Ощущение' }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/lab-feel.png`, fullPage: true });
await context.close();
await browser.close();
console.log(`saved to ${OUT}`);
```

Add `.superpowers/shots/` to `.gitignore` (the `.superpowers/` folder may already be ignored; check with `git check-ignore -v .superpowers/shots/x` and add the line only if it is not).

Run: `npm run build >/dev/null && (npm run preview -w @game/web -- --port 4173 --strictPort >/dev/null 2>&1 &) ; sleep 4; node scripts/shots.mjs; pkill -f "vite preview" || true`
Expected: `saved to .superpowers/shots/juice-1` and five PNGs plus a `.webm` there. Look at them.

- [ ] **Step 3: The stage check**

Run, in this order, and record the numbers in the ledger:

1. `npx tsc --noEmit -p .` → no output.
2. `npx vitest run` → all pass.
3. `npx playwright test --reporter=line` → all pass.
4. `npm run simulate 2>&1 | grep "^stage"` → the same stage reach as the baseline (100 / 100 / 69 / 37 / 37 / 9 %); any difference is a bug, not noise (the engine is untouched).
5. `npm run perf` (server as in Task 3) → note average and 5th percentile; below 55 is reported to the owner, not hidden.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lab/FeelTab.tsx apps/web/src/lab/CardLab.tsx apps/web/src/lab/lab.css scripts/shots.mjs .gitignore
git commit -m "feat(lab): «Ощущение» stand, screenshots script"
```

Then the executing-plans final review (fresh Opus reviewer on the branch, its Review Focus is the list at the top of this plan), the fix pass, and `finishing-a-development-branch`.

---

## Out of scope and follow-ups (told to the owner)

- Joker, tarot and focus cards still scale their larger source art by CSS (`pixelated`, but not by a whole factor). Pre-shrinking them by 2 would give 53 px jokers at ×1; it touches the shop, packs and fight HUD sizes, so it is a separate small stage after this one.
- Vibration itself (patterns on hit, purchase, pack) is stage 2; this stage only adds the switch.

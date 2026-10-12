# Fight screen shell (part C, step 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The fight screen loses everything that eats space without helping (enemy panel, status line, card counter, joker panel, idle sway, steep fan) and gets the owner's layout: top bar, enemy badge on its HP bar, full-size enemy backs, deck | table | joker stack, a flat hand, player HP, action buttons at the very bottom — on phone (both orientations) and desktop.

**Architecture:** Only `apps/web`. New small components (`EnemyBadge`, `JokerStack`, `JokerSheet`) with their logic in pure, unit-tested modules (`enemyTip.ts`, `firingJoker.ts`). `fight.css` is rewritten around one portrait grid and one landscape grid. Two landscape variants (A: narrow left sidebar, B: no sidebar, the portrait column centred) are switchable by `?layout=b` for the owner to choose; the loser is deleted in the last task after the owner picks.

**Tech Stack:** TypeScript strict, React 19, motion/react (`Reorder`, `layoutId`), Vitest (node env), Playwright (`mobile` Chromium all specs; `iphone`, `desktop-safari` WebKit only `shell.spec.ts`; workers 4).

**Spec:** `docs/superpowers/specs/2026-10-12-native-feel-design.md` — §4.3 (owner's 8 fight remarks, binding), §4.1 bugs 1, 2, 3, 9, §6 (Balatro language). Shop/pack (bugs 4–8), menu, settings, font and buttons are later steps, not this plan.

## Global Constraints

- `packages/durak` untouched; `npm run simulate` stays 100 / 100 / 69 / 37 / 37 / 9 %. The engine already allows `moveJoker` during a fight (`run.ts` `reorderJokers`).
- Animations: `transform` / `opacity` only; all motion respects `useMotionEnabled()` (Effects setting + reduced motion).
- Sprites are not redrawn. Card art scale stays a whole number of device pixels.
- No new dependencies (`Reorder` is part of `motion/react`, already installed).
- Fit: on 320×568, 375×667, 390×844, 412×915, 430×932, 667×375, 915×412, 1280×800, 1440×900 the fight screen root never overflows (`e2e/helpers/fit.ts` `screenOverflow` ≤ 0) with 5 jokers, 2 focuses, a picked focus, a 6-card table and 8 cards in hand.
- Every button / tappable ≥ 44×44 CSS px.
- Code, comments, commits in English; one commit per task.

## Owner decisions this plan implements (§4.3, 2026-10-12)

1. No enemy panel. The enemy's sprite sits at the start of its HP bar as a button, no counters on it; hover / tap / long press shows a tip with name, tier, boss rule, hit multiplier and enemy jokers. Circle / fight number are not shown in the fight (the shop already shows the next fight).
2. No status line and no toasts. (A visually hidden live region keeps the text for screen readers and the e2e waits.)
3. Enemy backs are whole, the same size as the player's cards, no count.
4. Top-bar boxes are all the same size; Меню the same height.
5. Jokers are a stack; a tap opens a modal fan with info and reordering; while scoring, the firing joker jumps out of the stack.
6. Landscape sidebar becomes narrow (variant A) — or disappears (variant B); owner picks.
7. Fan tilt ≤ ±3°, edge drop ≤ 4 px; idle sway removed everywhere (overrides stage 1). Hover lift and pointer tilt stay.
8. Action buttons (Беру / Бито / Готово, and Сыграть / Отмена for a picked focus) are the bottom row, under the player's HP, with their height always reserved.

## Rulings made while planning

- **Hidden status region stays** (`.sr-only`, `role="status"`): 3 e2e specs wait on it and screen readers need it. Cost if wrong: none visible.
- **Move errors**: the visible error text goes away with the status line; the existing `deny` sound stays and the hand does a short shake (transform only). Cost if wrong: a silent-mode player gets only the shake.
- **Reorder in the sheet**: drag (motion `Reorder`, x axis) *and* ◀ ▶ buttons for the selected joker (touch drag inside a modal is fiddly; the buttons are also what e2e drives). Cost if wrong: two ways to do one thing.
- **Card size on wide screens**: the rounding unit becomes 37 CSS px on screens with ≥ 2 device pixels per CSS px (37 CSS px = 74 device px, still a whole scale of the 74 px art), 74 px otherwise. This gives 111 px cards on a MacBook window instead of 74 (bug 2, «cards too small»). Cost if wrong: on a 3× phone in landscape 111 CSS px is 4.5× — a half-pixel scale; phones in landscape stay ≤ 74 px by height anyway.
- **Focus target hint text** («выбери 2 карты») is removed; the Сыграть button shows the pick count «Сыграть 1/2». Cost if wrong: a first-time player needs one try to see that cards are picked.
- **Variants are a URL switch** (`?layout=b`), not a lab tab: the owner looks at the real fight with real data on his phone over LAN. Removed in Task 9.

## Review Focus

- Score pops for enemy multiplier / enemy jokers must still find an anchor (they used to point at the removed RunHeader chips) → Task 2 e2e.
- The firing joker lifts out of the stack while scoring, and the stack cannot be opened during scoring → Task 4 test.
- Reordering in the sheet changes the scoring order immediately (engine state, saved run) → Task 5 e2e reloads and checks the order.
- Picking a focus never changes the screen height (the bottom row is reserved) → Task 6 e2e compares hand position before / after.
- Reduced motion / Effects off: the sheet opens without the fly-out, the firing joker does not move, the hand does not shake → Tasks 4–6 tests.

---

## File Structure

- Create `apps/web/src/games/durak/enemyTip.ts` (+ `.test.ts`) — tip lines for the enemy badge.
- Create `apps/web/src/games/durak/EnemyBadge.tsx` — the enemy's sprite button with the tip and score anchors.
- Create `apps/web/src/games/durak/firingJoker.ts` (+ `.test.ts`) — which player joker slot the current scoring beat points at.
- Create `apps/web/src/games/durak/JokerStack.tsx` — the stack in the fight.
- Create `apps/web/src/games/durak/JokerSheet.tsx` — the modal fan with info and reorder.
- Create `apps/web/src/games/durak/jokerStack.css` — styles of stack and sheet.
- Modify `apps/web/src/ui/fan.ts` (+ test), `FeelBox.tsx`, `PixelCard.tsx`, `components/CardView.tsx`, `visualRng.ts` (+ test), `settings.ts` (+ test), `screens/SettingsScreen.tsx`, `lab/CardLab.tsx`, `lab/FeelTab.tsx` — no sway.
- Modify `components/HpBar.tsx` — optional `lead` element.
- Modify `games/durak/DurakFightScreen.tsx`, `FightHands.tsx`, `FightStats.tsx`, `ActionBar.tsx`, `FocusBar.tsx`, `DurakRunScreen.tsx`, `fight.css` (rewrite), `theme.css` (`.sr-only`).
- Delete `games/durak/JokerPanel.tsx`; `RunHeader.tsx` stays only if something else imports it (it does not after Task 2 → delete).
- Modify e2e: `durak.spec.ts`, `jokers.spec.ts`, `motion.spec.ts`, `settings.spec.ts`, `layout.spec.ts`, `landscape.spec.ts`; create `e2e/fight-layout.spec.ts`.
- Modify `scripts/shots.mjs` — fight shots for both variants.

---

### Task 1: Flat fan, no idle sway

**Files:** `apps/web/src/ui/fan.ts`, `apps/web/src/ui/fan.test.ts`, `apps/web/src/ui/FeelBox.tsx`, `apps/web/src/ui/PixelCard.tsx`, `apps/web/src/components/CardView.tsx`, `apps/web/src/ui/visualRng.ts`, `apps/web/src/ui/visualRng.test.ts`, `apps/web/src/ui/settings.ts`, `apps/web/src/ui/settings.test.ts`, `apps/web/src/screens/SettingsScreen.tsx`, `apps/web/src/games/durak/FightHands.tsx`, `apps/web/src/games/durak/JokerPanel.tsx`, `apps/web/src/games/durak/DurakFightScreen.tsx`, `apps/web/src/lab/CardLab.tsx`, `apps/web/src/lab/FeelTab.tsx`, `e2e/motion.spec.ts`, `e2e/settings.spec.ts`

**Interfaces:**
- Produces: `fanAngle` ≤ ±3° over the whole fan, `fanDrop` ≤ 4 px. `Settings` without `sway`. `FeelBox` without `idle` / `swayDelay`; `Feel` without `sway`. `CardView` / `PixelCard` without `idle` / `swayDelay`. `PlayerHand` without `sway`. `swayPhases` deleted.

- [ ] **Step 1: Failing unit tests**

In `fan.test.ts` replace the spread/drop expectations with:

```ts
it('keeps the whole fan within ±3° (owner: a flat, Balatro-like arc)', () => {
  for (const count of [2, 3, 6, 8, 12]) {
    const angles = Array.from({ length: count }, (_, i) => fanAngle(i, count));
    expect(Math.max(...angles.map(Math.abs))).toBeLessThanOrEqual(3);
    expect(angles[0]).toBeLessThan(0);
  }
});

it('drops the outer cards at most 4 px', () => {
  for (const count of [2, 6, 12]) {
    expect(fanDrop(0, count)).toBeLessThanOrEqual(4);
    expect(fanDrop(Math.floor((count - 1) / 2), count)).toBeLessThanOrEqual(1);
  }
});
```

In `settings.test.ts`: remove `sway` from the expected defaults and fixtures, and add:

```ts
it('drops the retired sway flag from old saved settings and keeps the rest', () => {
  const parsed = parseSettings({ palette: 'felt', sway: false, sound: false });
  expect(parsed).not.toHaveProperty('sway');
  expect(parsed.palette).toBe('felt');
  expect(parsed.sound).toBe(false);
});
```

In `visualRng.test.ts` delete the `swayPhases` describe block.

- [ ] **Step 2: Run — must fail**

Run: `npx vitest run apps/web/src/ui/fan.test.ts apps/web/src/ui/settings.test.ts`
Expected: FAIL — angles up to 12°, drop 8 px, `sway` still present.

- [ ] **Step 3: Implement**

`fan.ts`: `const MAX_STEP_DEG = 1.5; const MAX_SPREAD_DEG = 3; const MAX_DROP_PX = 4;` and update the doc comment to «never exceeds ±3°».

`settings.ts`: delete the `sway` field from `Settings`, `DEFAULT_SETTINGS` and the schema (zod `object` strips unknown keys, so an old `sway` disappears). Update the `effects` comment: «Master switch for motion effects: tilt and everything the juice stages add.»

`FeelBox.tsx`: delete `sway` from `Feel` and `FEEL`, delete `SWAY_SECONDS`, the `idle` / `swayDelay` props and the outer `animate` / `transition`; the outer element becomes a plain `<div className="feel" style=…>`.

Remove the props through the callers: `PixelCard.tsx` (`swayDelay`, `idle`), `CardView.tsx` (`idle`, `swayDelay`), `FightHands.tsx` (`sway` prop, `idle={sway}`, `swayDelay`), `JokerPanel.tsx` (`idle`, `phases`, `swayPhases` import — the file is deleted in Task 4, keep it compiling until then), `DurakFightScreen.tsx` (`sway={…}`, `idle={…}`), `SettingsScreen.tsx` (the «Качание карт» checkbox), `visualRng.ts` (`swayPhases`), `lab/CardLab.tsx` (the «Покачивание» slider, `swayDelay` props), `lab/FeelTab.tsx` (any `idle`/sway usage). Let `npm run typecheck` list what is left.

- [ ] **Step 4: Unit + typecheck green**

Run: `npm run typecheck && npx vitest run 2>&1 | grep -E "Test Files|Tests "`
Expected: clean; all pass.

- [ ] **Step 5: e2e**

`e2e/motion.spec.ts`: delete «the hand sways» and «jokers sway on their own…»; rename «with effects off … the hand does not sway» to «the hand never sways» and run it with effects on (`EFFECTS_ON` storage state from `hand.spec.ts` pattern) — it reads the slot transforms twice 600 ms apart and expects them equal. `e2e/settings.spec.ts`: delete «card sway can be switched off…».

Run: `npx playwright test --project=mobile e2e/motion.spec.ts e2e/settings.spec.ts e2e/hand.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A apps/web/src e2e/motion.spec.ts e2e/settings.spec.ts
git commit -m "feat(web): flat ±3° fan and no idle sway (owner, overrides stage 1)"
```

---

### Task 2: Enemy badge instead of the enemy panel

**Files:**
- Create: `apps/web/src/games/durak/enemyTip.ts`, `apps/web/src/games/durak/enemyTip.test.ts`, `apps/web/src/games/durak/EnemyBadge.tsx`
- Modify: `apps/web/src/components/HpBar.tsx`, `apps/web/src/games/durak/DurakFightScreen.tsx`, `apps/web/src/games/durak/fight.css`, `e2e/durak.spec.ts`, `e2e/landscape.spec.ts`
- Delete: `apps/web/src/games/durak/RunHeader.tsx`

**Interfaces:**
- Produces: `enemyTipLines(enemy: EnemySpecView): readonly TipLine[]` where `EnemySpecView = { name: string; tier: EnemyTier; boss: BossId | null; jokers: readonly JokerId[] }` (the shape `stageEnemy` returns); `EnemyBadge({ run })`; `HpBar` prop `lead?: ReactNode` rendered before the label.

- [ ] **Step 1: Failing unit test `enemyTip.test.ts`**

```ts
import { BOSSES, JOKERS } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { enemyTipLines } from './enemyTip';

describe('enemyTipLines', () => {
  it('a plain enemy: only its name and tier', () => {
    expect(enemyTipLines({ name: 'Скупой', tier: 'normal', boss: null, jokers: [] })).toEqual([
      { name: 'Скупой', owner: 'соперник', description: 'Без особенностей' },
    ]);
  });

  it('a strong enemy: the hit multiplier and each joker with its rule', () => {
    const lines = enemyTipLines({ name: 'Задира', tier: 'strong', boss: null, jokers: ['clubs'] });
    expect(lines[0]).toEqual({ name: 'Задира', owner: 'сильный соперник', description: 'Бьёт сильнее: урон ×1.25' });
    expect(lines[1]).toEqual({ name: JOKERS.clubs.name, owner: 'джокер', description: JOKERS.clubs.description });
  });

  it('a boss: its rule comes first, then the multiplier', () => {
    const lines = enemyTipLines({ name: 'Генерал', tier: 'boss', boss: 'general', jokers: [] });
    expect(lines[0]).toEqual({ name: 'Генерал', owner: 'босс', description: BOSSES.general.description });
    expect(lines[1]).toEqual({ name: 'Урон ×1.5', owner: null, description: 'Удары босса по тебе умножаются' });
  });
});
```

(Check the joker id `clubs` exists in `JOKERS` — «Трефовик» in the owner's screenshot; use the real id from `packages/durak/src/content/jokers.ts` if it differs, and the real enemy names from `enemies.ts`.)

- [ ] **Step 2: Run — must fail** (`npx vitest run apps/web/src/games/durak/enemyTip.test.ts` → cannot resolve `./enemyTip`).

- [ ] **Step 3: Implement `enemyTip.ts`**

```ts
import { BOSSES, JOKERS, TIER_MULT, type BossId, type EnemyTier, type JokerId } from '@game/durak';
import type { TipLine } from '../../components/tipLines';

export type EnemySpecView = { readonly name: string; readonly tier: EnemyTier; readonly boss: BossId | null; readonly jokers: readonly JokerId[] };

const TIER_LABELS: Readonly<Record<EnemyTier, string>> = { normal: 'соперник', strong: 'сильный соперник', boss: 'босс' };

/** What the enemy badge tells: who it is, what makes it dangerous, its jokers. No counters on the badge itself. */
export function enemyTipLines(enemy: EnemySpecView): readonly TipLine[] {
  const mult = TIER_MULT[enemy.tier];
  const head: TipLine = {
    name: enemy.name,
    owner: TIER_LABELS[enemy.tier],
    description: enemy.boss ? BOSSES[enemy.boss].description : mult > 1 ? `Бьёт сильнее: урон ×${mult}` : 'Без особенностей',
  };
  const multLine: readonly TipLine[] = enemy.boss && mult > 1 ? [{ name: `Урон ×${mult}`, owner: null, description: 'Удары босса по тебе умножаются' }] : [];
  const jokers = enemy.jokers.map((id): TipLine => ({ name: JOKERS[id].name, owner: 'джокер', description: JOKERS[id].description }));
  return [head, ...multLine, ...jokers];
}
```

(If `stageEnemy` returns `boss` as `undefined` rather than `null`, widen `boss` to `BossId | null | undefined`; match the real type, do not cast.)

- [ ] **Step 4: Run — must pass.**

- [ ] **Step 5: `EnemyBadge.tsx` and `HpBar` lead**

```tsx
import { stageEnemy, type RunState } from '@game/durak';
import { CardTip, useCardTip } from '../../components/CardTip';
import { Icon } from '../../ui/Icon';
import { enemyTipLines } from './enemyTip';

const TIER_ICONS = { normal: 'skull', strong: 'skullStrong', boss: 'skullBoss' } as const;

/**
 * The enemy as one button at the start of its HP bar: the tip tells everything (owner, 2026-10-12).
 * It also carries the score anchors the old banner had, so the enemy's multiplier and jokers still pop here.
 */
export function EnemyBadge({ run }: { readonly run: RunState }) {
  const enemy = stageEnemy(run, run.stage);
  const { anchor, handlers } = useCardTip(true, true);
  return (
    <span className="enemy-badge-wrap">
      <button type="button" className={`enemy-badge enemy-badge--${enemy.tier}`} aria-label={`Соперник: ${enemy.name}`} aria-expanded={anchor !== null} data-testid="enemy-badge" {...handlers}>
        <Icon id={TIER_ICONS[enemy.tier]} />
        <span data-score-tier aria-hidden="true" className="enemy-badge__anchor" />
        {enemy.jokers.map((id, i) => (
          <span key={id} data-score-joker={`enemy-${i}`} aria-hidden="true" className="enemy-badge__anchor" />
        ))}
      </button>
      {anchor && <CardTip anchor={anchor} lines={enemyTipLines(enemy)} />}
    </span>
  );
}
```

`HpBar.tsx`: add `readonly lead?: ReactNode;` and render `{lead}` as the first child of the root (before `.hp__label`). In `DurakFightScreen.tsx` remove `<RunHeader run={run} />` and pass `lead={<EnemyBadge run={run} />}` to the enemy `HpBar`; the enemy label text becomes the enemy's name is NOT shown — keep `label="Соперник"` for `aria-label` but hide the visible label in CSS (`.hp--enemy .hp__label { display: none }`) since the badge identifies the enemy.

CSS (in `fight.css`, the rewrite in Task 7 keeps these rules):

```css
.enemy-badge { position: relative; display: grid; place-items: center; min-width: 44px; min-height: 44px; padding: 0; border: 0; border-radius: 8px; background: rgb(0 0 0 / 35%); cursor: pointer; }
.enemy-badge .icon { width: 32px; height: 32px; image-rendering: pixelated; }
.enemy-badge--strong { background: #a8611a; }
.enemy-badge--boss { background: #9c2a2a; }
.enemy-badge__anchor { position: absolute; inset: 0; pointer-events: none; }
```

- [ ] **Step 6: e2e**

`e2e/durak.spec.ts`: replace `getByTestId('run-header')…toContainText('Круг 1 · бой 1/3')` with `await expect(page.getByTestId('enemy-badge')).toBeVisible()` and, where the text matters, check the shop instead (`page.locator('.shop__stage')` contains `Круг 1 · бой 2`). `e2e/landscape.spec.ts`: use `enemy-badge` instead of `run-header` for the «left of the table» check (or the HP bar). Add to `durak.spec.ts`:

```ts
test('the enemy badge tells who the enemy is on tap', async ({ page }) => {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await page.getByTestId('enemy-badge').click();
  await expect(page.getByRole('tooltip')).toContainText('соперник');
  await expect(page.locator('[data-score-tier]')).toHaveCount(1);
});
```

Run: `npx playwright test --project=mobile e2e/durak.spec.ts e2e/landscape.spec.ts e2e/score.spec.ts`
Expected: PASS (score.spec covers the pops).

- [ ] **Step 7: Delete `RunHeader.tsx`** (and its CSS rules `.run-header*` in `fight.css`), typecheck, commit.

```bash
git add -A apps/web/src e2e
git commit -m "feat(web): enemy badge on its HP bar replaces the enemy panel"
```

---

### Task 3: No status line, whole enemy backs

**Files:** `apps/web/src/games/durak/DurakFightScreen.tsx`, `apps/web/src/games/durak/FightHands.tsx`, `apps/web/src/games/durak/fight.css`, `apps/web/src/ui/theme.css`, `e2e/layout.spec.ts`, `e2e/fight-layout.spec.ts` (create)

**Interfaces:**
- Produces: `.sr-only` utility in `theme.css`; `EnemyHand` without the count; `PlayerHand` prop `shakeKey: number` (changes on a rejected move → hand shakes).

- [ ] **Step 1: Failing e2e `e2e/fight-layout.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

async function startFight(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?seed=42');
  await page.getByRole('button', { name: 'Новый забег' }).click();
  await expect(page.getByTestId('player-hand')).toBeVisible();
}

test('the status text is for screen readers only and takes no space', async ({ page }) => {
  await startFight(page);
  const box = await page.getByRole('status').boundingBox();
  expect(box === null || (box.width <= 1 && box.height <= 1)).toBe(true);
});

test('enemy backs are whole, as big as the player cards, with no count', async ({ page }) => {
  await startFight(page);
  const sizes = await page.evaluate(() => {
    const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
    const back = document.querySelector('[data-testid="enemy-hand"] .card')!;
    return { back: rect('[data-testid="enemy-hand"] .card').width, mine: rect('[data-testid="player-hand"] .card').width, clip: getComputedStyle(back).clipPath, count: document.querySelectorAll('.hand__count').length };
  });
  expect(Math.round(sizes.back)).toBe(Math.round(sizes.mine));
  expect(sizes.clip).toBe('none');
  expect(sizes.count).toBe(0);
});
```

Run: `npx playwright test --project=mobile e2e/fight-layout.spec.ts` → FAIL (status panel visible, clip-path inset, count present).

- [ ] **Step 2: Implement**

`theme.css`: `.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }`.

`DurakFightScreen.tsx`: `<p className="sr-only" role="status">{error ?? statusText(fight)}</p>` instead of the panel. Pass `shakeKey={errorSeq}` to `PlayerHand`.

`FightHands.tsx`: delete the `hand__count` span. In `PlayerHand` wrap nothing new — on `shakeKey` change, if motion is on, animate the container with `useAnimate`: `x: [0, -6, 6, -3, 3, 0]` over 0.3 s (skip when `shakeKey === 0` or motion off).

`fight.css`: delete `.hand--enemy .card { clip-path… }`, `.hand__count`, `.fight__status`; `.hand--enemy { height: calc(var(--card-w) * 1.4); }` and its slots `bottom: 0` like the player's (no rotation: `useFan(…, false)` already).

- [ ] **Step 3: Run — must pass; then the old layout specs**

Run: `npx playwright test --project=mobile e2e/fight-layout.spec.ts e2e/layout.spec.ts e2e/hand.spec.ts e2e/focuses.spec.ts`
Expected: fight-layout PASS. layout/focuses may now FAIL on fit at 375×667 because the enemy hand grew — that is expected and fixed by the layout in Task 7; record which ones fail in the ledger, do not loosen them.

- [ ] **Step 4: Commit** `feat(web): status text for screen readers only, whole enemy backs without a count`

---

### Task 4: Joker stack

**Files:**
- Create: `apps/web/src/games/durak/firingJoker.ts`, `firingJoker.test.ts`, `JokerStack.tsx`, `jokerStack.css`
- Modify: `DurakFightScreen.tsx`; delete `JokerPanel.tsx`; modify `e2e/jokers.spec.ts`, `e2e/motion.spec.ts`

**Interfaces:**
- Consumes: `Playback.current: TimelineEvent | null` from `useScorePlayback`; `jokerBadge(id, state, enemyTakes)`.
- Produces: `firingJoker(event: TimelineEvent | null): number | null` — the player slot in `event.pop` or `event.bounce`, else null. `JokerStack({ jokers, state, enemyTakes, firing, disabled, onOpen })`. Each card element keeps `data-score-joker="player-<slot>"` and `layoutId="joker-<id>"`.

- [ ] **Step 1: Failing unit test `firingJoker.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { firingJoker } from './firingJoker';
import type { TimelineEvent } from './scoreTimeline';

const beat = (pop: TimelineEvent['pop'], bounce: TimelineEvent['bounce'] = []): TimelineEvent => ({ at: 0, duration: 1, pop, bounce, label: '+1', tone: 'chips', chips: 0, mult: 1, damage: null });

describe('firingJoker', () => {
  it('is the player slot the beat pops over', () => {
    expect(firingJoker(beat({ kind: 'joker', side: 'player', slot: 2 }))).toBe(2);
  });
  it('is the player slot that bounces when the pop is elsewhere', () => {
    expect(firingJoker(beat({ kind: 'card', cardId: 'x' }, [{ kind: 'joker', side: 'player', slot: 1 }]))).toBe(1);
  });
  it('ignores enemy jokers and beats without jokers', () => {
    expect(firingJoker(beat({ kind: 'joker', side: 'enemy', slot: 0 }))).toBeNull();
    expect(firingJoker(beat({ kind: 'hp', side: 'enemy' }))).toBeNull();
    expect(firingJoker(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run — fail; Step 3: implement**

```ts
import type { ScoreTarget, TimelineEvent } from './scoreTimeline';

const playerSlot = (target: ScoreTarget): number | null => (target.kind === 'joker' && target.side === 'player' ? target.slot : null);

/** The player joker the current scoring beat is about: it jumps out of the stack while the beat lasts. */
export function firingJoker(event: TimelineEvent | null): number | null {
  if (!event) return null;
  return playerSlot(event.pop) ?? event.bounce.map(playerSlot).find((slot) => slot !== null) ?? null;
}
```

(Export `ScoreTarget` from `scoreTimeline.ts` if it is not exported yet.)

- [ ] **Step 4: `JokerStack.tsx`**

```tsx
import { MAX_JOKERS, type JokerId, type JokerState } from '@game/durak';
import { motion } from 'motion/react';
import { useMotionEnabled } from '../../ui/useMotion';
import { jokerBadge } from './jokerBadge';
import { JokerFace } from './JokerFace';
import './jokerStack.css';

const STEP_PX = 3;

type JokerStackProps = {
  readonly jokers: readonly JokerId[];
  readonly state: JokerState;
  readonly enemyTakes: number;
  /** Slot of the joker the scoring show is on, or null. */
  readonly firing: number | null;
  /** True while scoring plays: the stack cannot be opened. */
  readonly disabled: boolean;
  readonly onOpen: () => void;
};

/** The player's jokers as one pile (owner, 2026-10-12): the first slot on top, a «3/5» tag, a tap opens the sheet. */
export function JokerStack({ jokers, state, enemyTakes, firing, disabled, onOpen }: JokerStackProps) {
  const motionOn = useMotionEnabled();
  return (
    <button type="button" className="jstack" data-testid="joker-stack" aria-label={`Джокеры: ${jokers.length} из ${MAX_JOKERS}`} disabled={disabled || jokers.length === 0} onClick={onOpen}>
      <span className="jstack__pile">
        {jokers.length === 0 && <span className="jstack__hole" aria-hidden="true" />}
        {jokers.map((id, slot) => {
          const depth = jokers.length - 1 - slot;
          const lifted = motionOn && firing === slot;
          return (
            <motion.span
              key={id}
              layoutId={`joker-${id}`}
              className="jstack__card"
              data-score-joker={`player-${slot}`}
              style={{ zIndex: lifted ? MAX_JOKERS + 1 : MAX_JOKERS - slot }}
              animate={{ x: -depth * STEP_PX, y: lifted ? -24 : -depth * STEP_PX, scale: lifted ? 1.08 : 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            >
              <JokerFace id={id} badge={slot === 0 || lifted ? jokerBadge(id, state, enemyTakes) : null} />
            </motion.span>
          );
        })}
      </span>
      <span className="jstack__count">
        {jokers.length}/{MAX_JOKERS}
      </span>
    </button>
  );
}
```

`jokerStack.css`:

```css
.jstack { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 44px; padding: 0; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; }
.jstack:disabled { cursor: default; }
.jstack__pile { --jface-w: var(--card-w); position: relative; display: block; width: var(--card-w); aspect-ratio: 5 / 7; }
.jstack__card { position: absolute; inset: 0; display: block; }
.jstack__hole { position: absolute; inset: 0; border-radius: 6px; background: rgb(0 0 0 / 35%); box-shadow: inset 0 2px 6px rgb(0 0 0 / 55%); }
.jstack__count { padding: 0 6px; border-radius: 4px; background: rgb(0 0 0 / 45%); font-size: 0.75rem; }
```

- [ ] **Step 5: Wire it** — in `DurakFightScreen.tsx` replace `<JokerPanel …/>` with `<JokerStack jokers={fight.jokers.player} state={fight.jokerState.player} enemyTakes={fight.fightTakes.enemy} firing={firingJoker(playback.current)} disabled={playback.active} onOpen={() => setSheetOpen(true)} />` (`const [sheetOpen, setSheetOpen] = useState(false)`; the sheet itself comes in Task 5 — until then `onOpen` sets state that nothing reads, fine for one task). Delete `JokerPanel.tsx` and its CSS (`.jokers*`, `.jslot*`).

- [ ] **Step 6: e2e** — `e2e/jokers.spec.ts` «hovering a joker card in the sidebar shows its rule» becomes «the joker stack shows how many jokers there are»: `await expect(page.getByTestId('joker-stack')).toHaveAccessibleName('Джокеры: 2 из 5')`. `e2e/motion.spec.ts` tilt tests that used `.jslot` are deleted (tilt lives on cards in hand and in the sheet). Add in `e2e/score.spec.ts`:

```ts
test('the firing joker jumps out of the stack while its beat plays', async ({ page }) => {
  // Reuse takeTheTable(page) from this file with a run that owns a scoring joker (e.g. 'looter'), effects on.
  // Read the transform of [data-score-joker="player-0"] during the show (poll until translateY < -10).
});
```

Write the body with the file's existing `takeTheTable` helper and an `EFFECTS_ON` storage state; poll `getComputedStyle(el).transform` for a `matrix(…, ty)` with `ty < -10` within the show.

Run: `npx vitest run apps/web/src/games/durak && npx playwright test --project=mobile e2e/jokers.spec.ts e2e/score.spec.ts e2e/motion.spec.ts` → PASS.

- [ ] **Step 7: Commit** `feat(web): jokers as a stack; the firing joker jumps out while scoring`

---

### Task 5: Joker sheet — fan, info, reorder

**Files:**
- Create: `apps/web/src/games/durak/JokerSheet.tsx`
- Modify: `jokerStack.css`, `DurakFightScreen.tsx`, `DurakRunScreen.tsx`, `e2e/jokers.spec.ts`

**Interfaces:**
- Consumes: `layoutId="joker-<id>"` from Task 4 (shared element: the cards fly from the pile into the fan).
- Produces: `JokerSheet({ jokers, state, enemyTakes, onMove, onClose })`; `DurakFightScreen` prop `onMoveJoker: (from: number, to: number) => void`; `DurakRunScreen` passes `(from, to) => act({ type: 'moveJoker', from, to })`.

- [ ] **Step 1: Failing e2e in `e2e/jokers.spec.ts`**

```ts
test('the stack opens into a sheet where jokers are read and reordered, and the order is saved', async ({ page }) => {
  // A fight with jokers ['looter', 'small'] — reuse the file's run-loading helper.
  await page.getByTestId('joker-stack').click();
  const sheet = page.getByRole('dialog', { name: 'Джокеры' });
  await expect(sheet).toBeVisible();
  const cards = sheet.getByRole('option');
  await expect(cards).toHaveCount(2);
  await cards.nth(1).click();
  await expect(sheet.getByTestId('joker-sheet-info')).toContainText('Мелочь'); // name of 'small' — use JOKERS.small.name
  await sheet.getByRole('button', { name: /левее/ }).click();
  await expect(cards.nth(0)).toHaveAccessibleName(/Мелочь/);
  await sheet.getByRole('button', { name: 'Закрыть' }).click();
  await expect(sheet).toBeHidden();
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('thegame.durak.run')!).run.jokers);
  expect(saved).toEqual(['small', 'looter']);
});
```

Run → FAIL (no dialog).

- [ ] **Step 2: Implement `JokerSheet.tsx`**

```tsx
import { JOKERS, type JokerId, type JokerState } from '@game/durak';
import { Reorder } from 'motion/react';
import { useState } from 'react';
import { PixelButton } from '../../ui/PixelButton';
import { jokerBadge } from './jokerBadge';
import { JokerFace } from './JokerFace';

type JokerSheetProps = {
  readonly jokers: readonly JokerId[];
  readonly state: JokerState;
  readonly enemyTakes: number;
  readonly onMove: (from: number, to: number) => void;
  readonly onClose: () => void;
};

/** The stack fanned out over a dimmed screen: tap a joker to read it, drag it or use ◀ ▶ to change the scoring order. */
export function JokerSheet({ jokers, state, enemyTakes, onMove, onClose }: JokerSheetProps) {
  const [selected, setSelected] = useState<JokerId | null>(jokers[0] ?? null);
  const index = selected ? jokers.indexOf(selected) : -1;
  const reorder = (next: JokerId[]): void => {
    const moved = next.findIndex((id, i) => id !== jokers[i]);
    if (moved < 0) return;
    const id = jokers[moved]!;
    onMove(moved, next.indexOf(id));
  };
  return (
    <div className="jsheet-backdrop" onClick={onClose}>
      <section className="jsheet panel" role="dialog" aria-modal="true" aria-label="Джокеры" onClick={(event) => event.stopPropagation()}>
        <Reorder.Group as="ul" axis="x" values={[...jokers]} onReorder={reorder} className="jsheet__fan" role="listbox" aria-label="Порядок джокеров">
          {jokers.map((id) => (
            <Reorder.Item key={id} value={id} layoutId={`joker-${id}`} as="li" className={id === selected ? 'jsheet__card jsheet__card--selected' : 'jsheet__card'} role="option" aria-selected={id === selected} aria-label={JOKERS[id].name} onClick={() => setSelected(id)}>
              <JokerFace id={id} badge={jokerBadge(id, state, enemyTakes)} />
            </Reorder.Item>
          ))}
        </Reorder.Group>
        {selected && (
          <div className="jsheet__info" data-testid="joker-sheet-info">
            <strong className="jsheet__name">{JOKERS[selected].name}</strong>
            <span className="jsheet__text">{JOKERS[selected].description}</span>
          </div>
        )}
        <div className="jsheet__actions">
          <PixelButton tone="blue" small aria-label={selected ? `${JOKERS[selected].name} левее` : 'Левее'} disabled={index <= 0} onClick={() => onMove(index, index - 1)}>
            ◀
          </PixelButton>
          <PixelButton tone="green" onClick={onClose}>
            Закрыть
          </PixelButton>
          <PixelButton tone="blue" small aria-label={selected ? `${JOKERS[selected].name} правее` : 'Правее'} disabled={index < 0 || index >= jokers.length - 1} onClick={() => onMove(index, index + 1)}>
            ▶
          </PixelButton>
        </div>
      </section>
    </div>
  );
}
```

(Use the `PixelButton` tones that exist — check `PixelButton.tsx`; if there is no `green`, use `orange`.) Note `onReorder` fires while dragging over each neighbour; each call moves the dragged joker by one place, which is what `moveJoker(from, to)` expects.

CSS appended to `jokerStack.css`:

```css
.jsheet-backdrop { position: fixed; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgb(0 0 0 / 65%); }
.jsheet { display: flex; flex-direction: column; align-items: center; gap: 12px; width: min(100%, 560px); padding: 14px; }
.jsheet__fan { --jface-w: clamp(64px, 17vw, 120px); display: flex; justify-content: center; gap: 8px; margin: 0; padding: 12px 0 0; list-style: none; touch-action: none; }
.jsheet__card { cursor: grab; transition: translate 0.15s ease-out; }
.jsheet__card--selected { translate: 0 -10px; filter: drop-shadow(0 0 6px var(--gold)); }
.jsheet__info { display: flex; flex-direction: column; gap: 4px; min-height: 3.6em; text-align: center; }
.jsheet__name { font-family: var(--font-head); font-size: 0.85rem; }
.jsheet__text { font-size: 0.9rem; line-height: 1.3; }
.jsheet__actions { display: flex; gap: 8px; }
```

- [ ] **Step 3: Wire** — `DurakFightScreen`: `{sheetOpen && <JokerSheet jokers={fight.jokers.player} state={fight.jokerState.player} enemyTakes={fight.fightTakes.enemy} onMove={onMoveJoker} onClose={() => setSheetOpen(false)} />}`; close it when scoring starts (`useEffect(() => { if (playback.active) setSheetOpen(false); }, [playback.active])`). `DurakRunScreen`: `onMoveJoker={(from, to) => act({ type: 'moveJoker', from, to })}`.

- [ ] **Step 4: Run** `npx playwright test --project=mobile e2e/jokers.spec.ts` → PASS; also with `reducedMotion: 'reduce'` emulated the sheet opens (add one assertion run under `test.use({ reducedMotion: 'reduce' })`).

- [ ] **Step 5: Commit** `feat(web): joker sheet — read, drag or ◀ ▶ to reorder, saved to the run`

---

### Task 6: Action row at the bottom; compact focuses

**Files:** `ActionBar.tsx`, `FocusBar.tsx`, `DurakFightScreen.tsx`, `fight.css`, `e2e/focuses.spec.ts`

**Interfaces:**
- Produces: `ActionBar` gets `focus: { label: string; ready: boolean; onPlay: () => void; onCancel: () => void } | null` — when not null the row shows «Сыграть n/m» and «Отмена» instead of Беру/Бито. `FocusBar` renders only the chips (no actions, no hint). The `.actions` row has a fixed height (`min-height: 52px`) and is always rendered.

- [ ] **Step 1: Failing e2e in `focuses.spec.ts`**

```ts
test('picking a focus puts Сыграть and Отмена in the bottom row and moves nothing', async ({ page }) => {
  // Fight with focuses ['boost', 'peek'] — reuse the file's open/shopRun helpers.
  const handBefore = await page.getByTestId('player-hand').boundingBox();
  await page.getByTestId('focus-bar').getByRole('button', { name: 'Разгон' }).click();
  const row = page.getByTestId('actions');
  await expect(row.getByRole('button', { name: /Сыграть/ })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Отмена' })).toBeVisible();
  const handAfter = await page.getByTestId('player-hand').boundingBox();
  expect(Math.abs(handAfter!.y - handBefore!.y)).toBeLessThanOrEqual(1);
  const rowBox = await row.boundingBox();
  const hp = await page.getByRole('meter', { name: 'Ты' }).boundingBox();
  expect(rowBox!.y).toBeGreaterThanOrEqual(hp!.y + hp!.height - 1);
});
```

Run → FAIL.

- [ ] **Step 2: Implement** — move the Сыграть / Отмена logic from `FocusBar` into `DurakFightScreen` (compute `ready` and the label `Сыграть ${pick.targets.length}/${FOCUSES[id].maxTargets}` when `maxTargets > 0`, else `Сыграть`), pass it to `ActionBar` as `focus`. `ActionBar` root: `<div className="actions" data-testid="actions">` always. `FocusBar` keeps the chip list only. `focusView.targetHint` stays in the codebase only if something else uses it; otherwise delete it with its test cases.

- [ ] **Step 3: Run** `npx playwright test --project=mobile e2e/focuses.spec.ts` → the new test PASS; fit tests may still fail until Task 7 (ledger them).

- [ ] **Step 4: Commit** `feat(web): action row at the bottom, focus play/cancel in it, compact focus chips`

---

### Task 7: The layout — portrait grid, landscape A/B, card scale, top bar

**Files:** `apps/web/src/games/durak/fight.css` (rewrite of the layout part), `DurakFightScreen.tsx`, `FightStats.tsx`, `e2e/fight-layout.spec.ts`, `e2e/layout.spec.ts`, `e2e/landscape.spec.ts`

**Interfaces:**
- Produces: `.fight[data-layout='a'|'b']` (read once from `?layout=`, default `a`); DOM order inside `main.fight`: `.fight__top` (menu, coins, deal) · `.hp--enemy` · `.hand--enemy` · `.fight__mid` (deck, table, `.fight__side-stack` = joker stack + focus chips) · `.hand--player` · `.charges` · `.hp--player` · `.actions`. The `aside` / `section` wrappers go away.

- [ ] **Step 1: Failing e2e — the fit matrix and the order** (append to `e2e/fight-layout.spec.ts`)

```ts
import { screenOverflow } from './helpers/fit';

const FULL_RUN = {
  seed: 3, rng: { seed: 1696107122 }, stage: 0, coins: 30, jokers: ['looter', 'small', 'rage', 'mirror', 'hearts'], collected: 0, profile: {}, focuses: ['boost', 'peek'],
  bosses: ['general', 'witch'],
  phase: { kind: 'shop', shop: { items: [null, null], packs: [null, null], rerollCost: 2, opened: null, casting: null }, reward: { base: 3, hpBonus: 5, interest: 2, jokerBonus: 0, cardBonus: 0, total: 10 } },
};
async function fullFight(page: import('@playwright/test').Page, layout: 'a' | 'b'): Promise<void> {
  await page.goto(`/?layout=${layout}`);
  await page.evaluate((run) => localStorage.setItem('thegame.durak.run', JSON.stringify({ version: 9, run })), FULL_RUN);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить забег' }).click();
  await page.getByRole('button', { name: /Следующий бой/ }).click();
  await expect(page.getByTestId('player-hand')).toBeVisible();
}

const SIZES = [[320, 568], [375, 667], [390, 844], [412, 915], [430, 932], [667, 375], [915, 412], [1280, 800], [1440, 900]] as const;

for (const layout of ['a', 'b'] as const) {
  for (const [width, height] of SIZES) {
    test(`layout ${layout}: the full fight fits ${width}×${height}, also with a focus picked`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await fullFight(page, layout);
      expect(await screenOverflow(page)).toBeLessThanOrEqual(0);
      await page.getByTestId('focus-bar').getByRole('button', { name: 'Разгон' }).click();
      expect(await screenOverflow(page)).toBeLessThanOrEqual(0);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll('.fight button')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); }).length,
      );
      expect(small).toBe(0);
    });
  }
}

test('portrait order: top bar, enemy HP, enemy hand, table, hand, player HP, actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fullFight(page, 'a');
  const ys = await page.evaluate(() =>
    ['.fight__top', '.hp--enemy', '[data-testid="enemy-hand"]', '[data-testid="table"]', '[data-testid="player-hand"]', '.hp--player', '[data-testid="actions"]'].map(
      (s) => document.querySelector(s)!.getBoundingClientRect().top,
    ),
  );
  expect([...ys].sort((a, b) => a - b)).toEqual(ys);
});

test('top-bar boxes are all the same size', async ({ page }) => {
  await fullFight(page, 'a');
  const boxes = await page.locator('.fight__top > *').evaluateAll((els) => els.map((e) => [Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)]));
  expect(new Set(boxes.map((b) => b[1])).size).toBe(1);
  expect(new Set(boxes.slice(1).map((b) => b[0])).size).toBe(1);
});

test('desktop (2× screen): cards are 111 px or more', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await fullFight(page, 'a');
  const w = await page.locator('[data-testid="player-hand"] .card').first().evaluate((el) => (el as HTMLElement).offsetWidth);
  expect(w).toBeGreaterThanOrEqual(111);
  expect(w % 37).toBe(0);
});
```

(The desktop test needs `deviceScaleFactor: 2`: `test.use({ deviceScaleFactor: 2 })` inside a `describe` around it. Also check the joker ids exist in `JOKERS`; replace any that do not.)

Run → FAIL on most sizes.

- [ ] **Step 2: Restructure the JSX** in `DurakFightScreen.tsx` to the DOM order above; `const layout = new URLSearchParams(window.location.search).get('layout') === 'b' ? 'b' : 'a';` → `<main className="screen fight" data-layout={layout}>`. `FightStats` returns two `.stats__tile` boxes (coin + value; «Раздача» + value) and `Меню` goes into the same `.fight__top` row.

- [ ] **Step 3: Write the layout CSS** (replace the old «screen layout», portrait/short-screen and landscape blocks of `fight.css`; keep cards, hands, table, deck, HP, overlay, tooltip, focus chips, badge rules):

```css
/* ---------- fight layout (owner, 2026-10-12): one column on phones, two layouts on wide screens ---------- */
.fight {
  --card-w: clamp(44px, min(13.5vw, 11.5vh), 74px);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto auto minmax(0, 1fr) auto auto auto auto;
  grid-template-areas: 'top' 'ehp' 'ehand' 'mid' 'hand' 'charges' 'php' 'actions';
  gap: 6px;
}
.fight__top { grid-area: top; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.fight__top > * { min-height: 44px; }
.hp--enemy { grid-area: ehp; }
.hand--enemy { grid-area: ehand; }
.fight__mid { grid-area: mid; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 8px; min-height: 0; }
.fight__side-stack { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.hand--player { grid-area: hand; height: calc(var(--card-w) * 1.4 + 12px); }
.charges { grid-area: charges; }
.hp--player { grid-area: php; }
.actions { grid-area: actions; display: flex; justify-content: center; gap: 12px; min-height: 52px; }
.actions .pbtn { min-width: 8em; }
.focus-chip__name { display: none; }

/* Exactly the 74 px art on phones tall enough for it. */
@media (max-aspect-ratio: 5/4) and (min-height: 780px) and (min-width: 396px) { .fight { --card-w: 74px; } }

/* ---------- wide screens ---------- */
@media (min-aspect-ratio: 5/4) {
  .fight {
    --card-fit: clamp(44px, min(14vh, 9vw), 222px);
    --card-step: 74px;
    --card-w: var(--card-fit);
    max-width: none;
    font-size: clamp(13px, 2.1vh, 24px);
  }
  /* A: Balatro — a narrow sidebar: menu, coins, deal, both HP bars. */
  .fight[data-layout='a'] {
    grid-template-columns: minmax(12em, 20%) minmax(0, 1fr);
    grid-template-rows: auto auto minmax(0, 1fr) auto auto;
    grid-template-areas: 'top ehand' 'ehp mid' 'charges mid' 'php hand' 'side-gap actions';
    column-gap: 1.2em;
  }
  .fight[data-layout='a'] .fight__top { grid-template-columns: 1fr 1fr; grid-auto-rows: auto; }
  .fight[data-layout='a'] .fight__menu { grid-column: 1 / -1; }
  /* B: no sidebar — the phone column, centred and wider. */
  .fight[data-layout='b'] { width: min(100%, 70em); margin-inline: auto; }
}
@media (min-aspect-ratio: 5/4) and (min-resolution: 2dppx) { .fight { --card-step: 37px; } }
@supports (width: round(down, 1px, 1px)) {
  @media (min-aspect-ratio: 5/4) { .fight { --card-w: max(round(down, var(--card-fit), var(--card-step)), min(var(--card-fit), 73px)); } }
}
```

Tune the numbers until the matrix passes; the *rules* are fixed (areas, order, equal top boxes, reserved action row, no element below 44 px), the numbers are not. Every tuning change goes in the ledger with the size that needed it.

- [ ] **Step 4: Run** `npx playwright test --project=mobile e2e/fight-layout.spec.ts e2e/layout.spec.ts e2e/landscape.spec.ts e2e/focuses.spec.ts` → PASS (update `layout.spec.ts` expectations that encode the old layout: `squeeze()` jokers checks are deleted, card width 74 at 412×915 stays, desktop «multiple of 74» becomes «multiple of 37 on 2×»).

- [ ] **Step 5: Whole suite + commit**

Run: `npm run typecheck && npx vitest run 2>&1 | grep -E "Tests " && npx playwright test 2>&1 | grep -E "passed|failed|flaky"`
Expected: all green.

```bash
git add -A apps/web/src e2e
git commit -m "feat(web): fight layout — top bar, enemy row, deck | table | jokers, flat hand, actions at the bottom; landscape A/B"
```

---

### Task 8: Shots for the owner and the choice

**Files:** `scripts/shots.mjs`

- [ ] **Step 1:** Extend `shots.mjs` with an output dir `.superpowers/shots/fight/` and, for `layout` a and b, screenshots of the full fight (the FULL_RUN from Task 7) at 390×844, 844×390, 1440×900 (deviceScaleFactor 2), plus the open joker sheet at 390×844 and a scoring frame with the firing joker lifted.
- [ ] **Step 2:** `npm run build && npm run preview -w @game/web -- --port 4173 --host` in the background, `node scripts/shots.mjs`, look at every PNG (Read tool) and fix anything obviously broken before showing it.
- [ ] **Step 3:** Hand over to the owner: the PNG paths, and the LAN links `http://<mac-ip>:4173/` and `…/?layout=b` for the phone. **Stop and wait for the owner's pick** (A or B, plus any remarks). This is a decision that is the owner's to make.

---

### Task 9: Keep the chosen layout

**Files:** `fight.css`, `DurakFightScreen.tsx`, `e2e/fight-layout.spec.ts`, `scripts/shots.mjs`

- [ ] **Step 1:** Delete the losing `[data-layout=…]` block, the `?layout` read and the `data-layout` attribute; the winner's rules become plain `.fight` rules inside the wide-screen media query. The fit matrix loops over one layout only.
- [ ] **Step 2:** Apply the owner's remarks from Task 8 (each remark → a test first if it is checkable).
- [ ] **Step 3:** Full verification: `npm run typecheck`, `npx vitest run`, `npx playwright test`, `npm run simulate` (unchanged).
- [ ] **Step 4:** Commit `feat(web): fight layout <A|B> kept (owner's choice)`. Then whole-branch review on Opus, fix pass, owner's OK, merge.

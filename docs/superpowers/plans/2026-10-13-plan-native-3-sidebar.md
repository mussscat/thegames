# Balatro-style left panel (part C, step 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Steps use checkbox syntax.

**Goal:** The fight's left panel (phone on its side, desktop window) gets the owner's Balatro layout: coloured title, enemy block (portrait + short info), a live «chips × mult = damage» counter that follows the cards on the table, player HP, coins/deal, and the Menu button at the bottom; everything larger.

**Architecture:** One pure engine function `previewTake(fight)` (shares its score-input builder with `chargeTake`, so the preview can never drift from a real take). The web app calls it on every render of the fight and shows the result in a `ScoreCounter`. The sidebar markup gets wrapper elements that are `display: contents` in portrait (portrait stays as it is) and real blocks on wide screens.

**Tech Stack:** TypeScript strict, React 19, Vitest, Playwright. **Spec:** `docs/superpowers/specs/2026-10-12-native-feel-design.md` §4.4 (owner's answer: the counter exists only in the side panel; portrait unchanged).

## Global Constraints

- `npm run simulate` unchanged: stage reach 100 / 100 / 69 / 37 / 37 / 9 % (the engine change is additive plus a pure refactor of `chargeTake`).
- Portrait (phone vertical, narrow windows) looks and behaves as before.
- Sidebar content never cut off: existing matrix tests («sidebar … nothing sticks out», notch tests) must stay green on the new content, at every wide size.
- No `em` inside `--card-*` / `--pile-*` / `--fit-w` variables (cycle with the card's own font-size).
- Code, comments, commits in English; one commit per task.

## Rulings made while planning

- **Preview = «as if the table were taken now»**: taken cards are the table's attack cards with the enhancement each was played with — exactly `boutResult` in `reducer.ts`. Cost if wrong: the counter differs from the real hit (a test pins them equal).
- **The sidebar's width grows from 19 % to 24 %** and `--fit-w` follows (`max(13 * fs, 24vw)`); the table on desktop stays at the 74 px step.
- **Short wide screens (≤ 500 px tall) get a compact sidebar**: title hidden (the name is in the enemy block), counter without its label.

## Review Focus

- The counter equals the real hit for the same table (also with jokers, focus charges, enemy attacking and the player's Щит).
- Counter during scoring playback and when the fight is over: no flicker, no negative or NaN values.
- Menu button last in tab order visually and not reachable by accident on a phone (it sits at the very bottom, under the notch inset).
- Sidebar at 932×321 with notch insets still fits (compact mode).
- Portrait untouched: the enemy badge, top bar and action row geometry tests keep passing.

---

### Task 1: `previewTake` in the engine

**Files:** `packages/durak/src/fight.ts`, `packages/durak/src/fight.test.ts`, `packages/durak/src/index.ts` (if `fight.ts` is not re-exported already).

**Interfaces — Produces:** `type TakePreview = { readonly taker: PlayerId; readonly chips: number; readonly mult: number; readonly damage: number }`; `previewTake(state: FightState): TakePreview | null` (null when the fight is over).

- [ ] **Step 1 (RED).** In `fight.test.ts` add `describe('previewTake')`:
  - empty table: `chips 0`, `mult` = the attacker's `baseMult`, `damage 0`, `taker` = the defender;
  - for each of: the `takingRound` fixture (enemy takes two attack cards), the same with player jokers `['small']` and `focusCharges { chips: 4, mult: 2, times: 1, shield: 1 }`, and a round the enemy attacks with the player holding `shield: 0.5`: `previewTake(state)` equals `{chips, mult, damage}` of `lastScore` after the real take (`applyFightAction(state, attacker, { type: 'endAttack' })` with `defenderTaking: true`).
  Run: `npx vitest run packages/durak/src/fight.test.ts` → FAIL (`previewTake` is not a function).
- [ ] **Step 2 (GREEN).** In `fight.ts` extract `takeScoreInput(state, taker, taken, round): ScoreInput` out of `chargeTake` (same fields), make `chargeTake` call it, add `previewTake` calling `scoreTake(takeScoreInput(state, taker, tableTaken(round), round))` with `taker = opponentOf(round.attacker)`.
- [ ] **Step 3.** `npx vitest run` all green; `npm run simulate` prints 100 / 100 / 69 / 37 / 37 / 9. Commit `feat(durak): previewTake — the hit a take would score now, built from the same input as a real take`.

### Task 2: `ScoreCounter` and the preview in the fight screen

**Files:** create `apps/web/src/games/durak/ScoreCounter.tsx`, `scoreCounter.css`, `counterText.ts` + `counterText.test.ts`; modify `DurakFightScreen.tsx`.

- [ ] **Step 1 (RED).** `counterText.test.ts`: `formatCounter(preview)` → `{ chips: '12', mult: '1.25', damage: '15', target: 'you' | 'enemy' }` (mult without trailing zeros, damage floored as the engine does); `previewLabel('player' | 'enemy')` → «Удар по тебе» / «Удар по сопернику».
- [ ] **Step 2 (GREEN).** Implement `counterText.ts`; `ScoreCounter` renders the label, a blue chips box × a red mult box, «= damage», with `data-testid="score-counter"` and `aria-live="off"`; the fight screen computes `previewTake(fight)` and renders it inside `.fight__side` (wide only, hidden by CSS in portrait).
- [ ] **Step 3 (e2e RED→GREEN).** `e2e/sidebar.spec.ts`: at 915×412 on `fullFight`: the counter shows chips `0`; after the player plays a playable card, chips > 0 (poll); at 390×844 (portrait) the counter is not visible.
- [ ] **Step 4.** Commit `feat(web): live chips × mult counter in the side panel`.

### Task 3: The panel itself — title, enemy block, order, size, Menu at the bottom

**Files:** `DurakFightScreen.tsx`, `FightStats.tsx`, `EnemyBadge.tsx` (info line), `fight.css`, `HpBar.tsx` (optional foot), `e2e/sidebar.spec.ts`.

- [ ] **Step 1 (RED).** In `sidebar.spec.ts`, at every wide size (`WIDE_SIZES` of `fight-layout.spec.ts`): the title shows the enemy's name (`.enemy-title`, not in portrait); inside the sidebar the order top→bottom is title, enemy block, counter, player HP, stats tiles, Menu (compare `getBoundingClientRect().top`s); Menu's bottom is the lowest in the sidebar; the enemy block has the portrait left of the HP text; the sidebar is at least 22 % of the width at ≥ 800 px wide; compact mode at ≤ 500 px tall (title hidden, still in order).
- [ ] **Step 2 (GREEN).** Markup: wrap the enemy in `.enemy-block` (title, `HpBar` with the badge, info line `×1.25 · rule`), wrap the two stats tiles in `.fight__stats`, move nothing in portrait (`display: contents`). CSS: sidebar `minmax(13em, 24%)`, `--fit-w` with `max(13 * fs, 24vw)`, tier-coloured title and block, big numbers, `.fight__menu` last with `margin-top: auto`, compact rules for `max-height: 500px`.
- [ ] **Step 3.** Fix whatever the existing matrix (sidebar fit, notch, tooSmall, centred deck/jokers, full table) reports; each fix keeps its test.
- [ ] **Step 4.** Full run: `npm run typecheck && npx vitest run && npx playwright test --workers=3`; commit `feat(web): Balatro-style side panel — title, enemy block, counter, Menu at the bottom, bigger`.

### Task 4: Hand over

- [ ] Rebuild (`npm run build`), keep the LAN preview serving it, report what to check on the phone; after the owner's remarks, Opus review of the whole branch, fix pass, then the owner's OK for the merge.

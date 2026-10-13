# Pixel stage (stage 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Steps use checkbox syntax.

**Goal:** The game lives in a stage measured in art pixels (1 CSS px inside = 1 art pixel), scaled by a whole number of device pixels with `transform`; the fight screen is rebuilt from the pixel kit (9-slice panels, buttons, HP bar), the m6x11 font and the CRT overlay.

**Architecture:** `computeScale` (pure, tested) feeds a `PixelStage` component that sizes and scales the root. Screens lay out in plain `px` (= art pixels) and use container queries on the stage instead of viewport media queries. UI chrome comes from generated PNGs (`assets/ui-kit`) through `border-image`, wrapped by `components/pixel/*`. Card, joker, tarot and focus sprites keep their current art in this stage.

**Tech Stack:** TypeScript strict, React 19, Motion, Vitest, Playwright, plain CSS. **Spec:** `docs/superpowers/specs/2026-10-14-pixel-grid-design.md` §2–§4 (stage 1).

## Global Constraints

- Engine `packages/durak` untouched; `npm run simulate` unchanged (stage reach 100 / 100 / 69 / 37 / 37 / 9 %).
- Inside the stage: sizes of panels, sprites and text in whole `px`; no `rem`, `em`, `%` for sprite or panel sizes, no fractional `px`; `image-rendering: pixelated` on sprites and 9-slice.
- No `border-radius`, blurred `box-shadow`, gradients, `filter` or Nunito in the fight screen (the CRT overlay and the grid debug layer are the only gradients, both documented exceptions).
- Static layout on the grid; moving objects are not snapped (spec §3.5).
- Code, comments, commits in English; one commit per task; UI strings stay Russian.
- Every task starts with a failing test where logic is involved (RED → GREEN); visual tasks end with an owner check on the iPhone in `?lab` or the running game, not a screenshot.

## Rulings made while planning

- **Two branches instead of one.** `feat/pixel-stage` covers the foundation and the fight in portrait (phone upright, the owner's main mode). `feat/pixel-stage-wide` follows with landscape and desktop (the sidebar layout from `native-3`). Cost if wrong: the fight has two layouts for one branch's lifetime; the stage works in both from task 2 so nothing is blocked. **Needs the owner's yes before task 1.**
- **Media queries become container queries** on the stage (`container-type: size`, `@container (min-width: …)`, widths in art pixels). Viewport `vh`/`vw` and `--vh` are not used inside the stage.
- **Branch base:** `feat/pixel-stage` starts from `feat/pixel-spike` (it carries the pilot, the spec and this plan).
- **Kit generator is promoted from the pilot:** `scripts/gen-pilot-kit.mjs` becomes `scripts/gen-ui-kit.mjs`; the lab pilot imports the same PNGs.
- **Nothing else imports `lab/pixel/*`** except the lab: `pixelScale` moves to `ui/`.

## Review Focus

- Coordinates under `transform` (task 3): every place that reads `getBoundingClientRect`, `clientX/Y`, `innerWidth` is converted or proven independent of scale; tests use `cssPerArt` ≠ 1.
- Every `data-sprite` box is a whole number of art pixels at n = 3 on iPhone and at Pixel 7 emulation (dpr 2.625).
- Safe-area insets (notch, home bar) stay correct inside a scaled stage (task 2).
- Touch targets (owner ruling 2026-10-14): action buttons are drawn large so the player never has to aim; **no artificial hit-area padding**. Fight action buttons ≥ 44 art px high (44 css px at n = 3), other buttons ≥ 32; the hit area is the sprite itself.
- Nothing in `fight.css` still depends on viewport units or `rem`.

---

### Task 1: Move the scale module out of the lab

**Files:** create `apps/web/src/ui/pixelScale.ts`, `apps/web/src/ui/pixelScale.test.ts`; modify `apps/web/src/lab/pixel/*` imports; delete the lab copies.

- [ ] Move `pixelScale.ts` and its test unchanged (git mv); fix imports; add `toArt(point, stage)`: converts a screen point (`clientX/Y`) into stage coordinates given the stage's `getBoundingClientRect()` origin and `cssPerArt`. RED test first: `toArt({x: 150, y: 90}, {left: 30, top: 10, cssPerArt: 2})` → `{x: 60, y: 40}`; zero or negative `cssPerArt` → treated as 1.
- [ ] `npm run typecheck && npx vitest run apps/web/src/ui apps/web/src/lab`.
- [ ] Commit: `refactor: move pixelScale to ui and add toArt`.

### Task 2: `PixelStage` and the page shell

**Files:** create `apps/web/src/ui/PixelStage.tsx`, `PixelStage.test.tsx` (pure parts as functions in `stageLayout.ts` + test); modify `main.tsx`, `App.tsx`, `ui/shell.css`, `ui/theme.css`, `ui/Backdrop.tsx`.

- [ ] RED: `stageLayout(viewport, target)` returns `{artW, artH, cssPerArt, offsetX, offsetY}`: the stage is centred, the remainder (less than one art pixel) is filler. Cases: iPhone Pro Max, Pixel 7, 1920×1080, 100×100.
- [ ] `PixelStage`: reads `visualViewport`/`devicePixelRatio`, re-measures on `resize`, `visualViewport.resize`, `orientationchange`, not during a touch gesture (pointer down → freeze, pointer up → apply). Renders the sized div with `transform: scale(cssPerArt)`, `transform-origin: 0 0`, `container-type: size`, `--k: cssPerArt` (unitless) and `--u`-free (children use plain px).
- [ ] `shell.css`: `--safe-*` inside the stage = `calc(env(safe-area-inset-*) / var(--k))` rounded up to whole art pixels; the stage fills `html/body/#root` (still fixed, no scroll). Remove `--vh` use from the stage tree.
- [ ] `App.tsx`: `Backdrop` stays full-screen outside the stage (it is a background, not UI); screens render inside the stage.
- [ ] e2e: `stage.spec.ts` on Pixel 7 + iPhone + 1920×1080: the stage's width/height are whole numbers of art pixels, `n` is an integer, the stage is centred, no scrollbars. `shell.spec.ts` stays green.
- [ ] Migration switch (found while building): screens not yet on the kit are sized in `vw`/`vh`/`rem`, which the stage would scale twice, so the stage is opt-in with `?pixel` (remembered; `?pixel=0` turns it off) until task 9 removes the switch. Owner check at this step is only «`?pixel` shows a centred, scrollless stage»; old screens look wrong inside it by design.
- [ ] Commit: `feat: PixelStage — a whole-number art-pixel stage scaled by transform`.

### Task 3: Coordinates audit

**Files:** `ui/useFan.ts`, `ui/useElementWidth.ts`, `ui/FeelBox.tsx`, `ui/canvasSize.ts`, `components/CardTip.tsx`, `games/durak/ScorePops.tsx` and their tests.

- [ ] For each file, write down in the test what it reads (layout size vs screen coordinate). RED test per file with `cssPerArt = 2.2857`: expected positions are in stage pixels.
- [ ] Rules: sizes from layout (`offsetWidth/Height`, `ResizeObserver` `contentRect`, never `getBoundingClientRect` for sizing); pointer positions and rect origins converted by `toArt`; a `StageContext` provides `cssPerArt` and the stage origin (default `1` and zero outside a stage, so tests and the lab keep working).
- [ ] `canvasSize.ts` (swirl) takes the pixel size in art pixels from the stage: swirl cell = 2 art pixels (lab-tunable constant).
- [ ] e2e: `hand.spec.ts`, `cardTip.spec.ts`, `score.spec.ts` updated to read the stage scale; a card tip opens next to its card inside the stage.
- [x] Done as built: `toArtLength`/`toArtRect`, `StageContext` now carries `root` and `frame()`, `StagePortal` replaces every `createPortal(…, document.body)` (CardTip, ScorePops, ConfirmReplace, DetailSheet), `tipPlacement.ts` (pure, tested), `FeelBox` proven scale-invariant by a test. The swirl block is `8 × cssPerArt` (same look as before; spec said 2 art px, the owner tunes it in the lab).
- [x] Commit: `fix: read layout, not screen, coordinates under the stage transform`.

### Task 4: Font and credits

**Files:** move `lab/pixel/kit/m6x11cyrillic.ttf` to `apps/web/src/assets/fonts/`; modify `main.tsx`, `ui/theme.css`, `screens/SettingsScreen.tsx`, `lab/pixel/pilot.css`.

- [ ] `@font-face 'm6x11'` with `font-display: block` (no fallback flash); `--font-text` and `--font-head` both m6x11; font sizes only 11 and 22; line-height whole px; `-webkit-font-smoothing: none`.
- [ ] Preload the font before the first frame (the app already waits for the sprites: add `document.fonts.load('11px m6x11')` to the preload `Promise.all`).
- [ ] Remove Nunito, Rubik and Press Start 2P imports from `main.tsx` **only if** no screen outside the fight still uses them; otherwise leave until stage 3 and note it.
- [ ] Settings screen: credits line «Шрифт m6x11: Daniel Linssen, кириллица Natto Games».
- [ ] Test: `theme.css` has the `@font-face` and the credits string is rendered.
- [ ] Commit: `feat: m6x11 Cyrillic font and credits`.

### Task 5: UI kit generator and generated CSS

**Files:** `scripts/gen-ui-kit.mjs` (from the pilot generator), `scripts/ui-kit/plate.mjs` (pure), `scripts/ui-kit/plate.test.mjs`, `apps/web/src/assets/ui-kit/*.png`, `apps/web/src/ui/ui-kit.css` (generated, committed), `package.json` script `kit`; vitest `include` gets `scripts/**/*.test.mjs`.

- [ ] RED: `plate()` tests: corner insets, outline follows the shape, lip rows, fully transparent corners, deterministic output.
- [ ] Sizes by the owner's touch ruling: primary buttons 44 art px high, secondary and danger 32; icon buttons (close, arrows) 32×32. Amend spec §4 stage 1 accordingly in the same commit.
- [ ] Elements (names fixed so the hand-drawn kit of stage 2 drops in): `panel`, `window`, `tip` (+4 arrows), `button-primary|secondary|danger` × `normal|pressed|disabled`, `hp-frame`, `price` × `ok|short`, `slot` × `empty|filled|selected`, `badge` × 3 rarities, `close`, `divider`. A `ui-kit.json` lists size, 9-slice insets and states.
- [ ] The generator writes the PNGs and `ui-kit.css` (classes `.px-panel`, `.px-btn--primary`, … with `border-image` and states by `:active`, `:disabled`, `[aria-pressed]`, `[aria-selected]`).
- [ ] Lab page «Кит» in the «Пиксели» tab: every element with every state, plus a grid overlay.
- [ ] Commit: `feat: temporary pixel UI kit generated by script`.

### Task 6: `Pixel*` components

**Files:** `apps/web/src/components/pixel/{PixelPanel,PixelButton,PixelBar,PixelSprite,PixelText,pixelBar.ts}.tsx` + tests; `ui/PixelButton.tsx` re-exports the new button during the migration, then is removed in task 9.

- [ ] RED: `barFill(hp, maxHp, innerWidth)` returns a whole number of art pixels, 0 only when `hp = 0`, full only when `hp = maxHp`, never negative or above the width (extends `hpSegments.test.ts` cases).
- [ ] RED: `PixelButton` renders the kit class for tone and size, `disabled` attribute, plays the select sound (as now), content shifts 1 px on press via CSS.
- [ ] `PixelSprite`: draws an atlas frame at natural size, `data-sprite` attribute for the e2e whole-pixel check.
- [ ] `PixelText`: m6x11 with the hard 1 px shadow; sizes `body` (11) and `title` (22).
- [ ] Commit per component pair.

### Task 7: Fight screen in portrait (one commit per block, owner check after the first and the last)

**Files:** `games/durak/fight.css` (portrait part), `DurakFightScreen.tsx`, `EnemyBlock.tsx`, `EnemyBadge.tsx`, `FightStats.tsx`, `HpBar.tsx`, `ScoreCounter.tsx`, `scoreCounter.css`, `ScoreBoard.tsx`, `JokerStack.tsx`, `jokerStack.css`, `DeckView.tsx`, `TableView.tsx`, `FightHands.tsx`, `ActionBar.tsx`, `FocusBar.tsx`, `FightOverlay.tsx`, `components/CardTip.tsx`, matching tests.

Order (each block: RED layout test or e2e assertion → rebuild → GREEN → commit):

- [ ] a. Top bar: enemy badge, name, HP (`PixelBar`), intent line.
- [ ] b. Score counter (`chips × mult`), pops (`ScorePops`) and the score board.
- [ ] c. Joker row/stack, joker sheet, focus bar.
- [ ] d. Table and deck pile (card sprites unchanged, shown at natural size on the grid; cards of different natural widths are placed on whole pixels).
- [ ] e. Player hand fan: index strip ≥ 18 art px visible, 7 cards fit at artW ≥ 360 (test with the real card widths); enemy hand.
- [ ] f. Action bar and round button (always on screen, as in `fight-shell`), status line.
- [ ] g. Overlays: result, card tip, joker sheet.
- [ ] Owner check on iPhone after block a (to catch kit/font problems early) and after block g.

### Task 8: CRT overlay in the game

**Files:** `ui/CrtOverlay.tsx` (from the lab), `ui/theme.css` (remove `.crt`), `ui/settings.ts` (+ test: `crt` boolean, default on), `screens/SettingsScreen.tsx`.

- [ ] RED: settings schema accepts and defaults `crt`; old saves without the key load with the default.
- [ ] Overlay inside the stage, period ½ art pixel, defaults from the lab (scan 22 %, vignette 35 %, tint 12 %); respects the existing «effects» setting.
- [ ] Commit: `feat: CRT overlay replaces the old scanline layer`.

### Task 9: Clean-up and verification

- [ ] Remove `.pbtn`, `.panel` and unused fight rules; update `fightCss.test.ts` (no `vh`/`rem` in the stage tree, `round()` checks only where still used).
- [ ] Grep gate for the fight tree: no `border-radius`, `linear-gradient`, `radial-gradient`, `blur(`, `backdrop-filter`, `Nunito` outside the documented exceptions (a unit test reads `fight.css`, `score.css`, `scoreCounter.css`, `jokerStack.css`).
- [ ] e2e: new whole-pixel assertion (`data-sprite` width and height ÷ `cssPerArt` is an integer) on Pixel 7, iPhone, 1920×1080.
- [ ] `npm run typecheck`, `npm test`, `npm run e2e`, `npm run simulate` (unchanged), `npm run build`.
- [ ] Code review of the branch (`/code-review`), fix CRITICAL and HIGH; merge into `main`; delete the lab pilot's duplicate constants.

### Task 10 (branch `feat/pixel-stage-wide`, after the owner accepts portrait)

- [ ] Landscape phone and desktop sidebar layouts rebuilt on container queries; the matrix tests (`sidebar.spec.ts`, `landscape.spec.ts`, `fight-layout.spec.ts`) updated to stage units. Its own plan is written after task 9 using what the portrait branch taught.

---

## Open items carried into execution

- Touch targets are settled (owner ruling): big drawn buttons, no invisible hit padding. The kit sizes follow: `button-primary` 44 high, `button-secondary` 32, `button-danger` 32 (the spec's 24/18/14 heights are replaced, spec §4 is amended in task 5).
- `TARGET_H = 320` is untested for tall phones and desktop (a 1920×1080 stage is 640×360 art px): checked in task 2, adjusted in `SCREEN_TARGET` if needed.
- m6x11 at 11 px may be small for long tip text on desktop: stage 3 decides the ×2 layer (spec §5.4).

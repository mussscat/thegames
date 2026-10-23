---
name: diagnose-animation
description: Diagnose an animation bug (cards vanish, flicker, fly from the wrong place) with evidence before writing any fix. Use when an animation or transition misbehaves.
---

Do NOT change code before the root cause is shown with evidence.

1. Start your own dev server on a separate port (never kill the user's). Reproduce the bug in headless Playwright at 390x844 on a deterministic state.
2. Add TEMPORARY instrumentation: console logs for the origin rect, the destination rect and every effect run (the app runs in React StrictMode, so effects fire twice in dev), and sample `getBoundingClientRect` of the moving elements on every animation frame.
3. Report the root cause with the numbers: which frame the element jumps or disappears, which rect was missing or stale.
4. Only then propose and apply a fix, remove the instrumentation, and re-run the SAME capture to prove the fix. Assertions are never loosened to make a run pass.

Known causes in this app: a StrictMode double effect that consumes the origin state; a destination measured before layout or from a stale ref; an effect attached to a static wrapper instead of the animated element; fan cards clipping outer glows.

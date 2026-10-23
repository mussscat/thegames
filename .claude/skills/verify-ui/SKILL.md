---
name: verify-ui
description: Visually verify a UI, CSS or animation change on a mobile viewport with Playwright before reporting it done. Use after any change to the shop, fight screen, lab or card rendering.
---

1. Start your own dev server on a SEPARATE port (`npx vite --port 5199 --host` in `apps/web`, in the background). Never kill the user's server; kill only your own PID when done.
2. Open the affected screen with Playwright at 390x844 (and 360x780 for layout work): the fight, the shop (`?sandbox` can start in the shop), or the lab (`?lab`). Hide the sandbox panel if it intercepts clicks.
3. Take a screenshot and LOOK at it: overlaps, clipping, uneven spacing, misaligned text or pips. For animations capture ~10 frames via `requestAnimationFrame` timestamps instead of one shot.
4. If cards are involved, compare the lab and the real game: they must render identically.
5. Fix what you see and repeat (up to ~6 rounds). Report honestly what you verified and what remains, with the screenshot paths. Do not estimate sizes from a user's screenshot and stop there.

---
name: compare-variants
description: For a taste-driven visual choice (glow, highlight, font, spacing), render 2-3 variants side by side in the lab and show screenshots before touching the real game.
---

1. Do not edit the real game. Build the variants in the lab (`?lab`), side by side on the same cards, in the same states (e.g. fanned cards, the card selected, the card animating).
2. Screenshot them with Playwright at 390x844 and show the images with a one-line description of each variant.
3. Wait for the user to pick one. Only then apply it to the real game and verify with /verify-ui.
4. Keep to the project's pixel style: m6x11 font, no hand-drawn glyphs, art sizes on the 360-art-pixel grid, no outer glows that fan cards would clip.

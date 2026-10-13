import { describe, expect, it } from 'vitest';
import { renderCss } from './css.mjs';
import { buildKit } from './spec.mjs';

const css = renderCss(buildKit());

describe('renderCss', () => {
  it('writes a class for every 9-slice element and button', () => {
    for (const cls of ['.px-panel', '.px-window', '.px-tip', '.px-hp-frame', '.px-price-ok', '.px-slot-selected', '.px-badge-rare', '.px-button-red-l', '.px-button-blue-s', '.px-close', '.px-icon-deck', '.px-icon-chip']) {
      expect(css).toContain(`${cls} {`);
    }
  });

  it('swaps the picture for :active and :disabled, never a filter or an opacity', () => {
    expect(css).toMatch(/\.px-button-red-l:active:not\(:disabled\)[^{]*{\s*border-image-source: url\('..\/assets\/ui-kit\/button-red-l-pressed.png'\)/);
    expect(css).toMatch(/\.px-button-red-l:disabled[^{]*{\s*border-image-source: url\('..\/assets\/ui-kit\/button-red-l-disabled.png'\)/);
    expect(css).not.toMatch(/filter|opacity|border-radius|gradient|box-shadow/);
  });

  it('keeps every slice, border width and height a whole number of px', () => {
    expect(css).not.toMatch(/\d\.\d+px/);
  });

  it('sizes large buttons 44 px and small ones 36 px high', () => {
    expect(css).toMatch(/\.px-button-red-l {[^}]*height: 44px/);
    expect(css).toMatch(/\.px-button-red-s {[^}]*height: 36px/);
  });
});

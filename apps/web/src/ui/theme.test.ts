import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./theme.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const shell = readFileSync(new URL('./shell.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('pixel font', () => {
  it('declares m6x11 with font-display: block, so text never flashes in a fallback font', () => {
    const face = css.match(/@font-face\s*{[^}]*}/)?.[0] ?? '';
    expect(face).toContain("font-family: 'm6x11'");
    expect(face).toContain('m6x11cyrillic.ttf');
    expect(face).toContain('font-display: block');
  });

  it('puts the stage on m6x11 at 22 px (2× its 11 px grid; 11 px is for captions) with no smoothing and no fake bold, heads included', () => {
    const stage = shell.match(/\.stage\s*{[^}]*}/)?.[0] ?? '';
    expect(stage).toContain("font-family: 'm6x11'");
    expect(stage).toContain('font-size: 22px');
    expect(stage).toContain('font-synthesis: none');
    expect(stage).toContain('font-weight: 400');
    expect(stage).toContain('-webkit-font-smoothing: none');
    expect(stage).toMatch(/--font-head:\s*'m6x11'/);
  });
});

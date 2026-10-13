import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./fight.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('fight.css', () => {
  it('uses CSS round() only inside an @supports block, so engines without it keep a plain card width', () => {
    const uses = [...css.matchAll(/round\(/g)].map((m) => m.index ?? 0);
    expect(uses.length).toBeGreaterThan(0);
    for (const at of uses) {
      const before = css.slice(0, at);
      const opened = before.lastIndexOf('@supports');
      const closedAfter = opened === -1 ? -1 : css.indexOf('\n}', opened);
      expect(opened).toBeGreaterThan(-1);
      expect(closedAfter).toBeGreaterThan(at);
    }
  });

  it('sizes nothing with the plain vh unit: on iPhone Safari vh ignores the toolbars, so cards come out too big for the visible screen', () => {
    const plain = [...css.matchAll(/[\d.]+vh\b/g)].map((m) => m[0]);
    expect(plain).toEqual([]);
  });

  it('never uses em inside the card-size variables: a card has its own font-size that depends on its width, a cycle that froze the page', () => {
    const sizing = [...css.matchAll(/--(?:fit-w|card-fit|card-w)\s*:([^;]+);/g)].map((m) => m[1] ?? '');
    expect(sizing.length).toBeGreaterThan(0);
    for (const value of sizing) expect(value).not.toMatch(/[\d.]em\b/);
  });

  it('reads the notch and home-bar insets through the --safe-* variables, never env() directly', () => {
    expect(css).not.toMatch(/env\(/);
    expect(css).toMatch(/var\(--safe-left\)/);
  });
});

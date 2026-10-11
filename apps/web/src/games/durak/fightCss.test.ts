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
});

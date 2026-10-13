import { describe, expect, it } from 'vitest';
import { buildKit } from './spec.mjs';

const kit = buildKit();
const byName = new Map(kit.map((e) => [e.name, e]));

describe('buildKit', () => {
  it('has unique names and a pixel for every cell', () => {
    expect(byName.size).toBe(kit.length);
    for (const e of kit) expect(e.pixels).toHaveLength(e.w * e.h);
  });

  it('every 9-slice cut lies inside its picture and leaves a middle', () => {
    for (const e of kit.filter((x) => x.slice)) {
      const [t, r, b, l] = e.slice;
      expect(t + b).toBeLessThan(e.h);
      expect(l + r).toBeLessThan(e.w);
    }
  });

  it('action buttons are big (owner ruling: no aiming): 44 art px high large, 32 small, in all four tones and three states', () => {
    for (const tone of ['blue', 'red', 'orange', 'green']) {
      for (const state of ['normal', 'pressed', 'disabled']) {
        expect(byName.get(`button-${tone}-l-${state}`)?.h).toBe(44);
        expect(byName.get(`button-${tone}-s-${state}`)?.h).toBe(32);
      }
    }
  });

  it('the three states of one button share a size and a slice, so a state change never moves the layout', () => {
    for (const tone of ['blue', 'red', 'orange', 'green']) {
      for (const size of ['l', 's']) {
        const [a, b, c] = ['normal', 'pressed', 'disabled'].map((s) => byName.get(`button-${tone}-${size}-${s}`));
        expect([a?.w, a?.h, a?.slice]).toEqual([b?.w, b?.h, b?.slice]);
        expect([a?.w, a?.h, a?.slice]).toEqual([c?.w, c?.h, c?.slice]);
      }
    }
  });

  it('icon buttons are 32×32', () => {
    for (const name of ['close', 'arrow-left', 'arrow-right']) {
      for (const state of ['normal', 'pressed']) expect(byName.get(`${name}-${state}`)).toMatchObject({ w: 32, h: 32 });
    }
  });

  it('has the elements the fight screen needs', () => {
    for (const name of ['panel', 'window', 'tip', 'tip-arrow-up', 'tip-arrow-down', 'hp-frame', 'price-ok', 'price-short', 'slot-empty', 'slot-filled', 'slot-selected', 'badge-common', 'badge-rare', 'badge-legendary', 'divider']) {
      expect(byName.has(name)).toBe(true);
    }
  });

  it('every opaque pixel is on the kit palette', () => {
    const palette = new Set(buildKit.palette.map((c) => c.join()));
    for (const e of kit) for (const p of e.pixels) if (p[3] !== 0) expect(palette.has(p.join())).toBe(true);
  });
});

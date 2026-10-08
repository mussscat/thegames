import { PERK_IDS } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { drawPerkEmblem, EMBLEM_SIZE, PERK_ICONS } from './perkEmblem';
import { getPixel } from './pixelArt';

describe('perk icons', () => {
  it('are 14×14 multi-colour drawings with every colour defined', () => {
    for (const id of PERK_IDS) {
      const { rows, palette } = PERK_ICONS[id];
      expect(rows, id).toHaveLength(14);
      for (const row of rows) {
        expect(row, id).toHaveLength(14);
        for (const ch of row) if (ch !== '.') expect(palette[ch], `${id}: ${ch}`).toBeDefined();
      }
    }
  });
});

describe('drawPerkEmblem', () => {
  it('is a 32×32 tile with notched corners and the icon in the middle', () => {
    const grid = drawPerkEmblem('looter');
    expect(EMBLEM_SIZE).toBe(32);
    expect([grid.w, grid.h]).toEqual([EMBLEM_SIZE, EMBLEM_SIZE]);
    expect(getPixel(grid, 0, 0)).toBeNull();
    expect(getPixel(grid, 16, 16)).not.toBeNull();
  });

  it('gives every perk its own emblem', () => {
    const drawn = PERK_IDS.map((id) => JSON.stringify(drawPerkEmblem(id).data));
    expect(new Set(drawn).size).toBe(PERK_IDS.length);
  });
});

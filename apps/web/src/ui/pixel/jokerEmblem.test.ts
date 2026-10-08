import { JOKER_IDS } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { drawJokerEmblem, EMBLEM_SIZE, JOKER_ICONS } from './jokerEmblem';
import { getPixel } from './pixelArt';

describe('joker icons', () => {
  it('are 14×14 multi-colour drawings with every colour defined', () => {
    for (const id of JOKER_IDS) {
      const { rows, palette } = JOKER_ICONS[id];
      expect(rows, id).toHaveLength(14);
      for (const row of rows) {
        expect(row, id).toHaveLength(14);
        for (const ch of row) if (ch !== '.') expect(palette[ch], `${id}: ${ch}`).toBeDefined();
      }
    }
  });
});

describe('drawJokerEmblem', () => {
  it('is a 32×32 tile with notched corners and the icon in the middle', () => {
    const grid = drawJokerEmblem('looter');
    expect(EMBLEM_SIZE).toBe(32);
    expect([grid.w, grid.h]).toEqual([EMBLEM_SIZE, EMBLEM_SIZE]);
    expect(getPixel(grid, 0, 0)).toBeNull();
    expect(getPixel(grid, 16, 16)).not.toBeNull();
  });

  it('gives every joker its own emblem', () => {
    const drawn = JOKER_IDS.map((id) => JSON.stringify(drawJokerEmblem(id).data));
    expect(new Set(drawn).size).toBe(JOKER_IDS.length);
  });
});

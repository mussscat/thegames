import { PERK_IDS } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { drawPerkEmblem, EMBLEM_SIZE } from './perkEmblem';
import { getPixel } from './pixelArt';

describe('drawPerkEmblem', () => {
  it('is a square tile with notched corners', () => {
    const grid = drawPerkEmblem('looter');
    expect([grid.w, grid.h]).toEqual([EMBLEM_SIZE, EMBLEM_SIZE]);
    expect(getPixel(grid, 0, 0)).toBeNull();
    expect(getPixel(grid, 8, 8)).not.toBeNull();
  });

  it('gives every perk its own emblem', () => {
    const drawn = PERK_IDS.map((id) => JSON.stringify(drawPerkEmblem(id).data));
    expect(new Set(drawn).size).toBe(PERK_IDS.length);
  });
});

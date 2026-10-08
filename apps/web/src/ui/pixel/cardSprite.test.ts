import { makeCard } from '@game/core';
import { ENHANCEMENT_IDS } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { drawBack, drawFront, SPRITE_H, SPRITE_W } from './cardSprite';
import { getPixel } from './pixelArt';

const QUEEN = makeCard('hearts', 12);

describe('drawFront', () => {
  it('is 50×70 with notched corners', () => {
    const grid = drawFront(QUEEN);
    expect([grid.w, grid.h]).toEqual([SPRITE_W, SPRITE_H]);
    expect(getPixel(grid, 0, 0)).toBeNull();
    expect(getPixel(grid, SPRITE_W - 1, SPRITE_H - 1)).toBeNull();
    expect(getPixel(grid, 25, 1)).not.toBeNull();
  });

  it('does not draw the rank: cards of one suit share a sprite', () => {
    expect(drawFront(makeCard('hearts', 6)).data).toEqual(drawFront(makeCard('hearts', 14)).data);
  });

  it('paints a different paper for every enhancement', () => {
    const papers = [undefined, ...ENHANCEMENT_IDS].map((id) => getPixel(drawFront(QUEEN, id), 8, 40));
    expect(new Set(papers).size).toBe(ENHANCEMENT_IDS.length + 1);
  });

  it('draws the enhancement icon in the top-right corner', () => {
    expect(getPixel(drawFront(QUEEN, 'coin'), 36, 12)).toBe('#ffd84a');
    expect(getPixel(drawFront(QUEEN), 36, 12)).not.toBe('#ffd84a');
  });

  it('draws red suits red and black suits dark', () => {
    const centre = (suit: 'hearts' | 'spades') => getPixel(drawFront(makeCard(suit, 9)), 24, 38);
    expect(centre('hearts')).not.toEqual(centre('spades'));
  });
});

describe('drawBack', () => {
  it('is 50×70 and differs from any front', () => {
    const back = drawBack();
    expect([back.w, back.h]).toEqual([SPRITE_W, SPRITE_H]);
    expect(back.data).not.toEqual(drawFront(QUEEN).data);
  });
});

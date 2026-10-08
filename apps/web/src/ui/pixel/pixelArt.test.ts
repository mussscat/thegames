import { describe, expect, it } from 'vitest';
import { createGrid, ditherIndex, getPixel, mix, setPixel, stampOutlinedIcon, stampShaded } from './pixelArt';

describe('grid', () => {
  it('ignores writes and reads outside the grid', () => {
    const grid = createGrid(2, 2);
    setPixel(grid, 5, 5, '#ffffff');
    setPixel(grid, -1, 0, '#ffffff');
    expect(grid.data.every((c) => c === null)).toBe(true);
    expect(getPixel(grid, 2, 0)).toBeNull();
  });
});

describe('mix', () => {
  it('returns the ends at 0 and 1 and the midpoint at 0.5', () => {
    expect(mix('#102030', '#f0e0d0', 0)).toBe('#102030');
    expect(mix('#102030', '#f0e0d0', 1)).toBe('#f0e0d0');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

describe('ditherIndex', () => {
  const block = (t: number) =>
    Array.from({ length: 16 }, (_, i) => ditherIndex(t, 4, i % 4, Math.floor(i / 4)));

  it('stays on the first and last step at the ends', () => {
    expect(new Set(block(0))).toEqual(new Set([0]));
    expect(new Set(block(1))).toEqual(new Set([3]));
  });

  it('mixes two neighbouring steps in between', () => {
    expect(new Set(block(0.5))).toEqual(new Set([1, 2]));
  });
});

describe('stampShaded', () => {
  it('lights the top-left edge and shades the bottom-right edge', () => {
    const grid = createGrid(4, 4);
    stampShaded(grid, ['XX', 'XX'], 0, 0, 2, 'B', 'L', 'D');
    expect(getPixel(grid, 0, 0)).toBe('L');
    expect(getPixel(grid, 1, 1)).toBe('B');
    expect(getPixel(grid, 3, 3)).toBe('D');
  });

  it('flips the mask upside down', () => {
    const grid = createGrid(2, 2);
    stampShaded(grid, ['X.', '..'], 0, 0, 1, 'B', 'L', 'D', true);
    expect(getPixel(grid, 0, 0)).toBeNull();
    expect(getPixel(grid, 1, 1)).not.toBeNull();
  });
});

describe('stampOutlinedIcon', () => {
  it('outlines the icon on painted pixels only', () => {
    const grid = createGrid(5, 5);
    for (let i = 0; i < 25; i++) setPixel(grid, i % 5, Math.floor(i / 5), '#ffffff');
    stampOutlinedIcon(grid, ['A'], { A: '#ff0000' }, 2, 2, 1, '#000000');
    expect(getPixel(grid, 2, 2)).toBe('#ff0000');
    expect([getPixel(grid, 1, 2), getPixel(grid, 3, 2), getPixel(grid, 2, 1), getPixel(grid, 2, 3)]).toEqual([
      '#000000',
      '#000000',
      '#000000',
      '#000000',
    ]);
    expect(getPixel(grid, 1, 1)).toBe('#ffffff');
  });

  it('leaves transparent pixels transparent', () => {
    const grid = createGrid(3, 3);
    stampOutlinedIcon(grid, ['A'], { A: '#ff0000' }, 1, 1, 1, '#000000');
    expect(getPixel(grid, 0, 1)).toBeNull();
  });
});

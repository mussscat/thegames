import { describe, expect, it } from 'vitest';
import { cellGridSize } from './canvasSize';

describe('cellGridSize', () => {
  it('is one backing pixel per cell, so the shader runs once per visible block', () => {
    expect(cellGridSize(1440, 900, 8)).toEqual({ width: 180, height: 113 });
    expect(cellGridSize(390, 844, 8)).toEqual({ width: 49, height: 106 });
  });

  it('never depends on the device pixel ratio and is at least 1×1', () => {
    expect(cellGridSize(0, 0, 8)).toEqual({ width: 1, height: 1 });
    expect(cellGridSize(5, 5, 8)).toEqual({ width: 1, height: 1 });
  });

  it('draws under 100 000 pixels (the old way: 14 million) even on a big retina window', () => {
    const { width, height } = cellGridSize(2560, 1440, 8);
    expect(width * height).toBeLessThan(100_000);
  });
});

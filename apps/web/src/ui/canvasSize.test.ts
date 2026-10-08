import { describe, expect, it } from 'vitest';
import { canvasSize } from './canvasSize';

describe('canvasSize', () => {
  it('rounds the backing size down to whole pixels on fractional DPR', () => {
    expect(canvasSize(412, 915, 2.625)).toEqual({ width: 1081, height: 2401 });
  });

  it('keeps integer sizes unchanged', () => {
    expect(canvasSize(390, 844, 3)).toEqual({ width: 1170, height: 2532 });
  });
});

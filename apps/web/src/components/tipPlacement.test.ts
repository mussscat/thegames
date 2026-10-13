import { describe, expect, it } from 'vitest';
import { anchorIn, tipShift } from './tipPlacement';

describe('anchorIn', () => {
  it('centres on the element and works in stage (art) pixels', () => {
    const anchor = anchorIn({ left: 130, top: 70, width: 60, height: 90 }, { left: 10, top: 10, cssPerArt: 2 });
    expect(anchor).toEqual({ x: 75, top: 30, bottom: 75 });
  });

  it('is plain screen geometry outside a stage', () => {
    expect(anchorIn({ left: 20, top: 40, width: 10, height: 10 }, { left: 0, top: 0, cssPerArt: 1 })).toEqual({ x: 25, top: 40, bottom: 50 });
  });
});

describe('tipShift', () => {
  it('leaves a bubble that fits where it is', () => {
    expect(tipShift(200, 100, 400, 8)).toBe(0);
  });

  it('pushes a bubble that sticks out on the left back inside by the edge margin', () => {
    expect(tipShift(20, 100, 400, 8)).toBe(38);
  });

  it('pushes a bubble that sticks out on the right back inside', () => {
    expect(tipShift(390, 100, 400, 8)).toBe(-48);
  });

  it('measures against the stage width, not the window: a 360-art-px stage on a wide window', () => {
    expect(tipShift(350, 100, 360, 8)).toBe(-48);
  });
});

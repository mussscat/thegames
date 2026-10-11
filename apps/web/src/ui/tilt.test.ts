import { describe, expect, it } from 'vitest';
import { tiltAngles } from './tilt';

const RECT = { left: 100, top: 200, width: 60, height: 80 };

describe('tiltAngles', () => {
  it('is flat in the middle', () => {
    const flat = tiltAngles(130, 240, RECT, 16);
    expect(flat.rotateX).toBeCloseTo(0);
    expect(flat.rotateY).toBeCloseTo(0);
  });

  it('leans towards the pointer: right edge → positive rotateY, top edge → positive rotateX', () => {
    expect(tiltAngles(160, 240, RECT, 16).rotateY).toBeCloseTo(8);
    expect(tiltAngles(130, 200, RECT, 16).rotateX).toBeCloseTo(8);
  });

  it('never leans past ±tilt/2, even when the finger is dragged far off the element', () => {
    const far = tiltAngles(5000, -5000, RECT, 16);
    expect(far.rotateY).toBeCloseTo(8);
    expect(far.rotateX).toBeCloseTo(8);
    expect(Math.abs(tiltAngles(-900, 900, RECT, 16).rotateY)).toBeCloseTo(8);
  });

  it('is flat for an element with no size instead of NaN', () => {
    const none = tiltAngles(10, 10, { left: 0, top: 0, width: 0, height: 0 }, 16);
    expect(none.rotateX).toBeCloseTo(0);
    expect(none.rotateY).toBeCloseTo(0);
  });
});

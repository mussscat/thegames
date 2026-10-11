import { describe, expect, it } from 'vitest';
import { motionAllowed } from './useMotion';

describe('motionAllowed', () => {
  it('needs effects on and no reduced-motion preference', () => {
    expect(motionAllowed(true, false)).toBe(true);
    expect(motionAllowed(false, false)).toBe(false);
    expect(motionAllowed(true, true)).toBe(false);
    expect(motionAllowed(false, true)).toBe(false);
  });
});

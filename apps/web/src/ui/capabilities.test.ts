import { describe, expect, it } from 'vitest';
import { canVibrate } from './capabilities';

describe('canVibrate', () => {
  it('is true only when the navigator has a vibrate function', () => {
    expect(canVibrate({ vibrate: () => true })).toBe(true);
    expect(canVibrate({})).toBe(false);
    expect(canVibrate({ vibrate: 'nope' })).toBe(false);
    expect(canVibrate(undefined)).toBe(false);
  });
});

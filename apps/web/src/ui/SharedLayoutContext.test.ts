import { describe, expect, it } from 'vitest';
import { layoutIdFor } from './SharedLayoutContext';

describe('layoutIdFor', () => {
  it('keeps the id while shared layout is on', () => {
    expect(layoutIdFor(true, 'h7')).toBe('h7');
  });

  it('drops it when shared layout is off, so a card appears in place instead of morphing between sprite sizes', () => {
    expect(layoutIdFor(false, 'h7')).toBeUndefined();
  });

  it('passes a missing id through', () => {
    expect(layoutIdFor(true, undefined)).toBeUndefined();
  });
});

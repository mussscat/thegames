import { describe, expect, it } from 'vitest';
import { fightLayout } from './fightLayout';

describe('fightLayout', () => {
  it('a touch device gets the sidebar layout, a mouse device the one without', () => {
    expect(fightLayout(true)).toBe('a');
    expect(fightLayout(false)).toBe('b');
  });

  it('an explicit override wins on either device', () => {
    expect(fightLayout(true, 'b')).toBe('b');
    expect(fightLayout(false, 'a')).toBe('a');
  });
});

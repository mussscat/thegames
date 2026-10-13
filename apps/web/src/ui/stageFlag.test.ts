import { describe, expect, it } from 'vitest';
import { stageEnabled } from './stageFlag';

describe('stageEnabled (migration switch, removed when the last screen is on the stage)', () => {
  it('is off by default', () => {
    expect(stageEnabled('', null)).toBe(false);
  });

  it('?pixel turns it on, ?pixel=0 turns it off', () => {
    expect(stageEnabled('?pixel', null)).toBe(true);
    expect(stageEnabled('?pixel=1', null)).toBe(true);
    expect(stageEnabled('?pixel=0', '1')).toBe(false);
  });

  it('remembers the last choice', () => {
    expect(stageEnabled('', '1')).toBe(true);
    expect(stageEnabled('', '0')).toBe(false);
  });

  it('ignores unrelated parameters', () => {
    expect(stageEnabled('?seed=5', null)).toBe(false);
  });
});

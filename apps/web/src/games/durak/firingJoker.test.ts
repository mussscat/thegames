import { describe, expect, it } from 'vitest';
import { firingJoker } from './firingJoker';
import type { TimelineEvent } from './scoreTimeline';

const beat = (pop: TimelineEvent['pop'], bounce: TimelineEvent['bounce'] = []): TimelineEvent => ({
  at: 0, duration: 1, pop, bounce, label: '+1', tone: 'chips', chips: 0, mult: 1, damage: null,
});

describe('firingJoker', () => {
  it('is the player slot the beat pops over', () => {
    expect(firingJoker(beat({ kind: 'joker', side: 'player', slot: 2 }))).toBe(2);
  });

  it('is the player slot that bounces when the pop is elsewhere', () => {
    expect(firingJoker(beat({ kind: 'card', cardId: 'x' }, [{ kind: 'joker', side: 'player', slot: 1 }]))).toBe(1);
  });

  it('ignores enemy jokers and beats without jokers', () => {
    expect(firingJoker(beat({ kind: 'joker', side: 'enemy', slot: 0 }))).toBeNull();
    expect(firingJoker(beat({ kind: 'hp', side: 'enemy' }))).toBeNull();
    expect(firingJoker(null)).toBeNull();
  });
});

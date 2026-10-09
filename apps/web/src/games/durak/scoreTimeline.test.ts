import type { Card } from '@game/core';
import type { ScoredHit, ScoreStep } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { anchorFor, boardAt, playbackCues, scoreTimeline, skipTarget, targetSelector } from './scoreTimeline';

const ace: Card = { id: 'hearts-14', suit: 'hearts', rank: 14 };
const six: Card = { id: 'clubs-6', suit: 'clubs', rank: 6 };

const cardStep = (card: Card, value: number, chips: number): ScoreStep => ({ source: { kind: 'card', card }, effect: { kind: 'chips', value }, chips, mult: 1 });

function hit(steps: readonly ScoreStep[], target: ScoredHit['target'] = 'enemy'): ScoredHit {
  const last = steps.at(-1);
  const chips = last?.chips ?? 0;
  const mult = last?.mult ?? 1;
  return { chips, mult, damage: Math.floor(chips * mult), steps, target };
}

describe('scoreTimeline', () => {
  it('times each step after the board fades in, then the final', () => {
    const t = scoreTimeline(hit([cardStep(ace, 3, 3), cardStep(six, 1, 4)]), 1);
    expect(t.events.map((e) => e.at)).toEqual([200, 550, 900]);
    expect(t.events.map((e) => e.duration)).toEqual([350, 350, 600]);
    expect(t.end).toBe(1700);
  });

  it('divides every duration by the speed', () => {
    const t = scoreTimeline(hit([cardStep(ace, 3, 3)]), 3);
    expect(t.events[0]?.at).toBeCloseTo(200 / 3);
    expect(t.events[1]?.at).toBeCloseTo(550 / 3);
    expect(t.events[1]?.duration).toBeCloseTo(200);
    expect(t.end).toBeCloseTo(1350 / 3);
  });

  it('labels chips, mult and times; the final shows the damage over the taker HP bar', () => {
    const steps: ScoreStep[] = [
      cardStep(ace, 3, 3),
      { source: { kind: 'enhancement', card: ace, enhancement: 'sharp' }, effect: { kind: 'mult', value: 1 }, chips: 3, mult: 2 },
      { source: { kind: 'joker', side: 'attacker', slot: 1, joker: 'trumpAce', acting: 'trumpAce' }, effect: { kind: 'times', value: 2 }, chips: 3, mult: 4 },
      { source: { kind: 'joker', side: 'defender', slot: 0, joker: 'thickSkin', acting: 'thickSkin' }, effect: { kind: 'times', value: 0.5 }, chips: 3, mult: 2 },
    ];
    const t = scoreTimeline(hit(steps, 'enemy'), 1);
    expect(t.events.map((e) => [e.label, e.tone])).toEqual([
      ['+3', 'chips'], ['+1 множ.', 'mult'], ['×2', 'times'], ['×0.5', 'times'], ['−6', 'final'],
    ]);
    expect(t.events.at(-1)).toMatchObject({ pop: { kind: 'hp', side: 'enemy' }, bounce: [], chips: 3, mult: 2, damage: 6 });
  });

  it('maps attacker jokers to the opponent of the taker and defender jokers to the taker', () => {
    const steps: ScoreStep[] = [
      cardStep(six, 1, 1),
      { source: { kind: 'joker', side: 'attacker', slot: 2, joker: 'gloat', acting: 'gloat' }, effect: { kind: 'mult', value: 2 }, chips: 1, mult: 3 },
      { source: { kind: 'joker', side: 'defender', slot: 0, joker: 'usurer', acting: 'usurer' }, effect: { kind: 'times', value: 1.5 }, chips: 1, mult: 4.5 },
    ];
    const t = scoreTimeline(hit(steps, 'player'), 1);
    expect(t.events[1]).toMatchObject({ pop: { kind: 'joker', side: 'enemy', slot: 2 }, bounce: [{ kind: 'joker', side: 'enemy', slot: 2 }] });
    expect(t.events[2]).toMatchObject({ pop: { kind: 'joker', side: 'player', slot: 0 } });
  });

  it('pops a per-card joker (and a mirror copying one) over the card while its own ticket bounces', () => {
    const steps: ScoreStep[] = [
      cardStep(ace, 3, 3),
      { source: { kind: 'joker', side: 'attacker', slot: 0, joker: 'mirror', acting: 'hearts' }, effect: { kind: 'chips', value: 3 }, chips: 6, mult: 1 },
      { source: { kind: 'joker', side: 'attacker', slot: 1, joker: 'hearts', acting: 'hearts' }, effect: { kind: 'chips', value: 3 }, chips: 9, mult: 1 },
    ];
    const t = scoreTimeline(hit(steps, 'enemy'), 1);
    expect(t.events[1]).toMatchObject({ pop: { kind: 'card', cardId: 'hearts-14' }, bounce: [{ kind: 'joker', side: 'player', slot: 0 }], label: '+3' });
    expect(t.events[2]).toMatchObject({ pop: { kind: 'card', cardId: 'hearts-14' }, bounce: [{ kind: 'joker', side: 'player', slot: 1 }] });
  });

  it('pops the tier step over the banner and a card step over its card, bouncing it', () => {
    const steps: ScoreStep[] = [
      { source: { kind: 'tier' }, effect: { kind: 'times', value: 1.25 }, chips: 0, mult: 1.25 },
      cardStep(six, 1, 1),
    ];
    const t = scoreTimeline(hit(steps, 'player'), 1);
    expect(t.events[0]).toMatchObject({ pop: { kind: 'tier' }, bounce: [], label: '×1.25' });
    expect(t.events[1]).toMatchObject({ pop: { kind: 'card', cardId: 'clubs-6' }, bounce: [{ kind: 'card', cardId: 'clubs-6' }] });
  });

  it('plays only the final for a hit with no steps', () => {
    const t = scoreTimeline(hit([]), 1);
    expect(t.events).toHaveLength(1);
    expect(t.events[0]).toMatchObject({ at: 200, tone: 'final', label: '−0' });
  });
});

describe('boardAt', () => {
  const t = scoreTimeline(hit([cardStep(ace, 3, 3), cardStep(six, 1, 4)]), 1);
  it('starts at 0 × 1 before the first step', () => {
    expect(boardAt(t, -1)).toEqual({ chips: 0, mult: 1, damage: null });
  });
  it('follows the running values and shows the damage only on the final', () => {
    expect(boardAt(t, 0)).toEqual({ chips: 3, mult: 1, damage: null });
    expect(boardAt(t, 2)).toEqual({ chips: 4, mult: 1, damage: 4 });
  });
});

describe('playbackCues', () => {
  const t = scoreTimeline(hit([cardStep(ace, 3, 3), cardStep(six, 1, 4)]), 1);
  it('cues every event from the start', () => {
    expect(playbackCues(t, 0)).toEqual({ cues: [{ at: 200, index: 0 }, { at: 550, index: 1 }, { at: 900, index: 2 }], doneAt: 1700 });
  });
  it('skipping cues the final at once and is the same when repeated', () => {
    const skip = playbackCues(t, 2);
    expect(skip).toEqual({ cues: [{ at: 0, index: 2 }], doneAt: 800 });
    expect(playbackCues(t, 2)).toEqual(skip);
  });
});

describe('skipTarget', () => {
  const t = scoreTimeline(hit([cardStep(ace, 3, 3), cardStep(six, 1, 4)]), 1);
  it('jumps to the final from the board or any step', () => {
    expect(skipTarget(t, -1)).toBe(2);
    expect(skipTarget(t, 1)).toBe(2);
  });
  it('finishes at once when the final is already showing, so a skip never makes the show longer', () => {
    expect(skipTarget(t, 2)).toBe('done');
  });
});

describe('targets', () => {
  it('builds a selector per target kind', () => {
    expect(targetSelector({ kind: 'card', cardId: 'hearts-14' })).toBe('[data-score-card="hearts-14"]');
    expect(targetSelector({ kind: 'joker', side: 'enemy', slot: 1 })).toBe('[data-score-joker="enemy-1"]');
    expect(targetSelector({ kind: 'tier' })).toBe('[data-score-tier]');
    expect(targetSelector({ kind: 'hp', side: 'player' })).toBe('[data-score-hp="player"]');
  });
  it('falls back to the board when the target is not on screen, and to null when neither is', () => {
    const only = (present: string) => (selector: string) => (selector === present ? selector : null);
    expect(anchorFor({ kind: 'tier' }, only('[data-score-tier]'))).toBe('[data-score-tier]');
    expect(anchorFor({ kind: 'tier' }, only('[data-score-board]'))).toBe('[data-score-board]');
    expect(anchorFor({ kind: 'tier' }, only('nothing'))).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { createRun, type RunState } from '../run/run';
import { botFocus, botTargets, simulateRun, summarize } from './simulate';

describe('simulateRun', () => {
  it('plays a whole run deterministically and records every fight', () => {
    const a = simulateRun(42);
    expect(simulateRun(42)).toEqual(a);
    expect(a.fights.length).toBe(a.won ? 6 : a.stagesWon + 1);
    expect(summarize([a])).toContain('stage 1');
  });
});

describe('botTargets', () => {
  const hand = ['clubs-6', 'clubs-7', 'clubs-8', 'clubs-9', 'clubs-10'];
  it('fills an enhancement tarot up to its limit', () => {
    expect(botTargets('sun', hand, {})).toEqual(['clubs-6', 'clubs-7']);
    expect(botTargets('chariot', hand, {})).toEqual(['clubs-6']);
    expect(botTargets('hermit', hand, {})).toEqual([]);
  });
  it('Смерть copies from an enhanced hand card, or is skipped', () => {
    expect(botTargets('death', hand, { 'clubs-8': 'trump' })).toEqual(['clubs-6', 'clubs-8']);
    expect(botTargets('death', hand, {})).toBeNull();
  });
});

describe('botFocus', () => {
  const inFight = (focuses: RunState['focuses'], attacker: 'player' | 'enemy'): RunState => {
    const run = createRun(1);
    if (run.phase.kind !== 'fight') throw new Error('not in a fight');
    return { ...run, focuses, phase: { kind: 'fight', fight: { ...run.phase.fight, round: { ...run.phase.fight.round, attacker, table: [] } } } };
  };

  it('plays Копилочка at once and boosts at the start of an attack', () => {
    expect(botFocus(inFight(['peek', 'piggy'], 'player'))).toEqual({ type: 'useFocus', slot: 1, targets: [] });
    expect(botFocus(inFight(['boost'], 'player'))).toEqual({ type: 'useFocus', slot: 0, targets: [] });
  });

  it('does nothing on the enemy turn or with focuses it does not play', () => {
    expect(botFocus(inFight(['piggy'], 'enemy'))).toBeNull();
    expect(botFocus(inFight(['peek', 'swap'], 'player'))).toBeNull();
  });

  it('raises a shield when it is its turn to defend', () => {
    const run = inFight(['shield'], 'enemy');
    if (run.phase.kind !== 'fight') throw new Error('not in a fight');
    const { round } = run.phase.fight;
    const card = round.hands.enemy[0];
    if (!card) throw new Error('no enemy card');
    const defending: RunState = {
      ...run,
      phase: { kind: 'fight', fight: { ...run.phase.fight, round: { ...round, table: [{ attack: card, defense: null }], hands: { ...round.hands, enemy: round.hands.enemy.slice(1) } } } },
    };
    expect(botFocus(defending)).toEqual({ type: 'useFocus', slot: 0, targets: [] });
  });
});

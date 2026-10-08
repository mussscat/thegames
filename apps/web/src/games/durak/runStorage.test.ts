import { makeCard } from '@game/core';
import { applyRunAction, createRun, scoreTake, type RunState } from '@game/durak';
import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from './runSchema';
import { clearRun, loadRun, RUN_STORAGE_KEY, saveRun, type KeyValueStore } from './runStorage';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const brokenStore: KeyValueStore = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

function shopRun(): RunState {
  const run = createRun(1);
  if (run.phase.kind !== 'fight') throw new Error('not in a fight');
  const won = { ...run, phase: { kind: 'fight' as const, fight: { ...run.phase.fight, winner: 'player' as const } } };
  const result = applyRunAction(won, { type: 'leaveFight' });
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe('run storage', () => {
  it('reports no save on an empty store', () => {
    expect(loadRun(memoryStore())).toEqual({ status: 'none' });
  });

  it('round-trips a fight run and a shop run', () => {
    for (const run of [createRun(42), shopRun()]) {
      const store = memoryStore();
      expect(saveRun(store, run)).toBe(true);
      expect(loadRun(store)).toEqual({ status: 'ok', run });
    }
  });

  it('clears the save', () => {
    const store = memoryStore();
    saveRun(store, createRun(1));
    clearRun(store);
    expect(loadRun(store)).toEqual({ status: 'none' });
  });

  it.each([
    ['not JSON', '{oops'],
    ['wrong version', JSON.stringify({ version: SAVE_VERSION + 1, run: {} })],
    ['wrong shape', JSON.stringify({ version: SAVE_VERSION, run: { stage: 'x' } })],
  ])('treats %s as invalid', (_label, raw) => {
    expect(loadRun(memoryStore({ [RUN_STORAGE_KEY]: raw }))).toEqual({ status: 'invalid' });
  });

  it('rejects tampered saves: 6 jokers or negative coins', () => {
    const run = createRun(1);
    const tampered = [
      { ...run, jokers: ['looter', 'cardSharp', 'piggyBank', 'thickSkin', 'clubs', 'gloat'] },
      { ...run, coins: -5 },
    ];
    for (const bad of tampered) {
      const store = memoryStore({ [RUN_STORAGE_KEY]: JSON.stringify({ version: SAVE_VERSION, run: bad }) });
      expect(loadRun(store)).toEqual({ status: 'invalid' });
    }
  });

  it('rejects a v6 save (perks era) as corrupted', () => {
    const store = memoryStore({ [RUN_STORAGE_KEY]: JSON.stringify({ version: 6, run: {} }) });
    expect(loadRun(store)).toEqual({ status: 'invalid' });
  });

  it('round-trips a fight with jokers and a scored take', () => {
    const run = createRun(1);
    if (run.phase.kind !== 'fight') throw new Error('not in a fight');
    const lastScore = { ...scoreTake({
      taken: [{ card: makeCard('clubs', 7), enhancement: 'golden' }],
      trumpSuit: 'hearts',
      boss: null,
      topCard: null,
      takerPriorTakes: 0,
      baseMult: 1,
      attacker: { jokers: ['mirror', 'clubs'], state: { rage: 0, cleanStreak: 0, collected: 0 } },
      defender: { jokers: ['usurer'], state: { rage: 0, cleanStreak: 0, collected: 0 } },
    }), target: 'enemy' as const };
    const fight = { ...run.phase.fight, jokers: { player: ['mirror', 'clubs'] as const, enemy: ['usurer'] as const }, lastScore };
    const saved: RunState = { ...run, jokers: ['mirror', 'clubs'], collected: 2, phase: { kind: 'fight', fight } };
    const store = memoryStore();
    expect(saveRun(store, saved)).toBe(true);
    expect(loadRun(store)).toEqual({ status: 'ok', run: saved });
  });

  it('rejects saves from version 1', () => {
    const store = memoryStore({ [RUN_STORAGE_KEY]: JSON.stringify({ version: 1, run: createRun(1) }) });
    expect(loadRun(store)).toEqual({ status: 'invalid' });
  });

  it('survives a storage that throws', () => {
    expect(saveRun(brokenStore, createRun(1))).toBe(false);
    expect(loadRun(brokenStore)).toEqual({ status: 'invalid' });
    expect(() => clearRun(brokenStore)).not.toThrow();
  });
});

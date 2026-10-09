import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../storage';
import { DEFAULT_SETTINGS, loadSettings, parseSettings, saveSettings, SETTINGS_STORAGE_KEY } from './settings';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return {
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

describe('parseSettings', () => {
  it('defaults to the Неон palette, sound on, volume 0.35, sway on, sorted by suit', () => {
    expect(DEFAULT_SETTINGS).toEqual({ palette: 'neon', sound: true, volume: 0.35, sway: true, sort: { bySuit: true, rank: 'asc', trumps: 'last' }, animSpeed: 1 });
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values', () => {
    const settings = { palette: 'felt', sound: false, volume: 0.5, sway: false, sort: { bySuit: false, rank: 'desc', trumps: 'mixed' }, animSpeed: 2 };
    expect(parseSettings(settings)).toEqual(settings);
  });

  it('replaces each invalid field with its default', () => {
    expect(parseSettings({ palette: 'pink', sound: 'yes', volume: 7, sway: 'no', sort: 'suit' })).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ palette: 'balatro', volume: -1 })).toEqual({ ...DEFAULT_SETTINGS, palette: 'balatro' });
  });

  it('repairs each sort field on its own', () => {
    expect(parseSettings({ sort: { bySuit: false, rank: 'up', trumps: 'first' } }).sort).toEqual({ bySuit: false, rank: 'asc', trumps: 'first' });
  });

  it('defaults the animation speed to x1 and keeps each valid speed', () => {
    expect(parseSettings({}).animSpeed).toBe(1);
    for (const speed of [1, 1.5, 2, 3]) expect(parseSettings({ animSpeed: speed }).animSpeed).toBe(speed);
  });

  it('repairs a bad animation speed without touching the rest', () => {
    for (const bad of ['fast', 0, 4, null]) {
      const parsed = parseSettings({ animSpeed: bad, sway: false });
      expect(parsed.animSpeed).toBe(1);
      expect(parsed.sway).toBe(false);
    }
  });

  it('ignores non-object input', () => {
    expect(parseSettings('neon')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('loadSettings / saveSettings', () => {
  it('round-trips through the store', () => {
    const store = memoryStore();
    const settings = { palette: 'balatro', sound: false, volume: 0.8, sway: false, sort: { bySuit: true, rank: 'desc', trumps: 'first' }, animSpeed: 3 } as const;
    expect(saveSettings(store, settings)).toBe(true);
    expect(loadSettings(store)).toEqual(settings);
  });

  it('falls back to defaults on missing, corrupted or unavailable storage', () => {
    expect(loadSettings(memoryStore())).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(memoryStore({ [SETTINGS_STORAGE_KEY]: '{' }))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(brokenStore)).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('reports a failed save', () => {
    expect(saveSettings(brokenStore, DEFAULT_SETTINGS)).toBe(false);
  });
});

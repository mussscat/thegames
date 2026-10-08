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
  it('defaults to the Неон palette, sound on, volume 0.35, sway on', () => {
    expect(DEFAULT_SETTINGS).toEqual({ palette: 'neon', sound: true, volume: 0.35, sway: true });
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values', () => {
    const settings = { palette: 'felt', sound: false, volume: 0.5, sway: false };
    expect(parseSettings(settings)).toEqual(settings);
  });

  it('replaces each invalid field with its default', () => {
    expect(parseSettings({ palette: 'pink', sound: 'yes', volume: 7, sway: 'no' })).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ palette: 'balatro', volume: -1 })).toEqual({ ...DEFAULT_SETTINGS, palette: 'balatro' });
  });

  it('ignores non-object input', () => {
    expect(parseSettings('neon')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('loadSettings / saveSettings', () => {
  it('round-trips through the store', () => {
    const store = memoryStore();
    const settings = { palette: 'balatro', sound: false, volume: 0.8, sway: false } as const;
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

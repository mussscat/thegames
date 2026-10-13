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
  it('defaults to the Неон palette, sound on, volume 0.35, sorted by suit', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      palette: 'neon', sound: true, volume: 0.35, sort: { bySuit: true, rank: 'asc', trumps: 'last' }, animSpeed: 1, effects: true, vibration: true,
    });
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values', () => {
    const settings = { palette: 'felt', sound: false, volume: 0.5, sort: { bySuit: false, rank: 'desc', trumps: 'mixed' }, animSpeed: 2, effects: false, vibration: false };
    expect(parseSettings(settings)).toEqual(settings);
  });

  it('replaces each invalid field with its default', () => {
    expect(parseSettings({ palette: 'pink', sound: 'yes', volume: 7, sort: 'suit' })).toEqual(DEFAULT_SETTINGS);
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
      const parsed = parseSettings({ animSpeed: bad, sound: false });
      expect(parsed.animSpeed).toBe(1);
      expect(parsed.sound).toBe(false);
    }
  });

  it('turns effects and vibration on when an older save does not have them', () => {
    const old = parseSettings({ palette: 'neon', sound: false, volume: 0.2, sway: false });
    expect(old.effects).toBe(true);
    expect(old.vibration).toBe(true);
    expect(old.sound).toBe(false);
  });

  it('keeps an explicit off, and a wrong type falls back to on without resetting the other fields', () => {
    expect(parseSettings({ effects: false, vibration: false })).toMatchObject({ effects: false, vibration: false });
    const mixed = parseSettings({ effects: 'yes', vibration: 3, sound: false });
    expect(mixed).toMatchObject({ effects: true, vibration: true, sound: false });
  });

  it('drops the retired sway flag from old saved settings and keeps the rest', () => {
    const parsed = parseSettings({ palette: 'felt', sway: false, sound: false });
    expect(parsed).not.toHaveProperty('sway');
    expect(parsed.palette).toBe('felt');
    expect(parsed.sound).toBe(false);
  });

  it('ignores non-object input', () => {
    expect(parseSettings('neon')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('loadSettings / saveSettings', () => {
  it('round-trips through the store', () => {
    const store = memoryStore();
    const settings = { palette: 'balatro', sound: false, volume: 0.8, sort: { bySuit: true, rank: 'desc', trumps: 'first' }, animSpeed: 3, effects: false, vibration: true } as const;
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

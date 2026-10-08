import { z } from 'zod';
import type { KeyValueStore } from '../storage';
import { PALETTE_IDS, type PaletteId } from './palettes';

export type Settings = {
  readonly palette: PaletteId;
  readonly sound: boolean;
  readonly volume: number;
  /** Idle sway of the cards in hand. */
  readonly sway: boolean;
};

export const DEFAULT_SETTINGS: Settings = { palette: 'neon', sound: true, volume: 0.35, sway: true };

export const SETTINGS_STORAGE_KEY = 'thegame.settings';

/** Each field falls back to its default on its own, so one bad value never resets the rest. */
const schema = z.object({
  palette: z.enum(PALETTE_IDS).catch(DEFAULT_SETTINGS.palette),
  sound: z.boolean().catch(DEFAULT_SETTINGS.sound),
  volume: z.number().min(0).max(1).catch(DEFAULT_SETTINGS.volume),
  sway: z.boolean().catch(DEFAULT_SETTINGS.sway),
});

export function parseSettings(raw: unknown): Settings {
  const input = typeof raw === 'object' && raw !== null ? raw : {};
  return schema.parse(input);
}

export function loadSettings(store: KeyValueStore | null): Settings {
  if (!store) return DEFAULT_SETTINGS;
  try {
    const raw = store.getItem(SETTINGS_STORAGE_KEY);
    return raw === null ? DEFAULT_SETTINGS : parseSettings(JSON.parse(raw));
  } catch (error) {
    console.warn('Could not load settings; using defaults', error);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(store: KeyValueStore, settings: Settings): boolean {
  try {
    store.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.warn('Could not save settings', error);
    return false;
  }
}

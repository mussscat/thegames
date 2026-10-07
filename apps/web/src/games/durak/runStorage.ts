import type { RunState } from '@game/durak';
import { parseSave, SAVE_VERSION } from './runSchema';

export const RUN_STORAGE_KEY = 'thegame.durak.run';

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type LoadResult =
  | { readonly status: 'none' }
  | { readonly status: 'ok'; readonly run: RunState }
  | { readonly status: 'invalid' };

export function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('localStorage is unavailable; the run will not be saved', error);
    return null;
  }
}

export function saveRun(store: KeyValueStore, run: RunState): boolean {
  try {
    store.setItem(RUN_STORAGE_KEY, JSON.stringify({ version: SAVE_VERSION, run }));
    return true;
  } catch (error) {
    console.warn('Could not save the run', error);
    return false;
  }
}

export function loadRun(store: KeyValueStore): LoadResult {
  try {
    const raw = store.getItem(RUN_STORAGE_KEY);
    if (raw === null) return { status: 'none' };
    const run = parseSave(JSON.parse(raw));
    return run ? { status: 'ok', run } : { status: 'invalid' };
  } catch (error) {
    console.warn('Could not load the saved run', error);
    return { status: 'invalid' };
  }
}

export function clearRun(store: KeyValueStore): void {
  try {
    store.removeItem(RUN_STORAGE_KEY);
  } catch (error) {
    console.warn('Could not clear the saved run', error);
  }
}

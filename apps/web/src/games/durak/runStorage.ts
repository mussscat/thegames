import type { RunState } from '@game/durak';
import type { KeyValueStore } from '../../storage';
import { parseSave, SAVE_VERSION } from './runSchema';

export { browserStore, type KeyValueStore } from '../../storage';

export const RUN_STORAGE_KEY = 'thegame.durak.run';

export type LoadResult =
  | { readonly status: 'none' }
  | { readonly status: 'ok'; readonly run: RunState }
  | { readonly status: 'invalid' };

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

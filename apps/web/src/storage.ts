export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('localStorage is unavailable; progress and settings will not be saved', error);
    return null;
  }
}

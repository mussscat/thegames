const KEY = 'thegame.pixel';

/**
 * Migration switch: screens that are not on the pixel kit yet are sized in viewport units and would be scaled twice
 * inside the stage, so the stage is opt-in (`?pixel`, remembered) until the last screen is migrated.
 */
export function stageEnabled(search: string, remembered: string | null): boolean {
  const param = new URLSearchParams(search).get('pixel');
  if (param !== null) return param !== '0';
  return remembered === '1';
}

export function readStageFlag(): boolean {
  try {
    const enabled = stageEnabled(window.location.search, window.localStorage.getItem(KEY));
    window.localStorage.setItem(KEY, enabled ? '1' : '0');
    return enabled;
  } catch {
    return stageEnabled(window.location.search, null);
  }
}

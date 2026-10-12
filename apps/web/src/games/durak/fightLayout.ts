export type FightLayout = 'a' | 'b';

/**
 * Wide-screen layout of the fight (owner, 2026-10-12): a phone (touch) gets the Balatro-like sidebar in either
 * orientation; a mouse-and-keyboard browser gets the layout without a sidebar, narrow or wide.
 * `override` (the `?layout=` address parameter) wins, for tests and for comparing.
 */
export function fightLayout(touch: boolean, override: FightLayout | null = null): FightLayout {
  return override ?? (touch ? 'a' : 'b');
}

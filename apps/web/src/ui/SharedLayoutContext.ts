import { createContext, useContext } from 'react';

/**
 * Whether a card may morph into its place elsewhere (Motion's shared `layoutId`). The pixel stage turns it off: a card
 * from the hand (74×104) and the same card on the table (52×73) are different sprites, and morphing one into the other
 * scales a sprite and swaps it at the end, which reads as a redraw.
 */
export const SharedLayoutContext = createContext(true);

export function useSharedLayout(): boolean {
  return useContext(SharedLayoutContext);
}

/** The `layoutId` to give a card: its id when shared layout is on, nothing when it is off. */
export function layoutIdFor(shared: boolean, id: string | undefined): string | undefined {
  return shared ? id : undefined;
}

import { createContext, useContext } from 'react';
import type { CardSize } from './pixel/cardArt';

/** Which sprite size the cards below show: `l` (74×104, the hand) or `s` (52×73, the table, the deck, the joker stack). */
export const CardSizeContext = createContext<CardSize>('l');

export function useCardSize(): CardSize {
  return useContext(CardSizeContext);
}

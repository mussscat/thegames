import { SUIT_SYMBOLS, type Suit } from '@game/core';
import { suitMarkUrl } from './pixel/cardArt';

/** A suit sign one text line high; the text symbol if the sprite is not available. */
export function SuitMark({ suit }: { readonly suit: Suit }) {
  const url = suitMarkUrl(suit);
  if (!url) return <span aria-hidden="true">{SUIT_SYMBOLS[suit]}</span>;
  return <img className="icon" src={url} alt="" draggable={false} />;
}

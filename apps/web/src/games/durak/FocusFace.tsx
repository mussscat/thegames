import type { FocusId } from '@game/durak';
import { focusArtUrl } from '../../ui/pixel/cardArt';
import './FocusFace.css';

/**
 * A focus as a card: its picture on the teal background of its rarity. Without art (sprites not loaded) it
 * returns null — the caller draws its own fallback.
 */
export function FocusFace({ id }: { readonly id: FocusId }) {
  const art = focusArtUrl(id);
  if (!art) return null;
  return (
    <span className="fface">
      <img className="sprite fface__art" src={art} alt="" draggable={false} />
    </span>
  );
}

import { TAROTS, type TarotId } from '@game/durak';
import { tarotArtUrl } from '../../ui/pixel/cardArt';
import './TarotFace.css';

type TarotFaceProps = { readonly id: TarotId };

/**
 * A tarot as a card: its picture on the background of its rarity, the roman numeral in the banner and the name on
 * the ribbon. Without art (sprites not loaded) it returns null — the caller draws its own fallback.
 */
export function TarotFace({ id }: TarotFaceProps) {
  const art = tarotArtUrl(id);
  if (!art) return null;
  const tarot = TAROTS[id];
  return (
    <span className={`tface tface--${tarot.rarity}`}>
      <img className="sprite tface__art" src={art} alt="" draggable={false} />
      <span className="tface__numeral">{tarot.numeral}</span>
      <span className={tarot.name.length > 9 ? 'tface__name tface__name--long' : 'tface__name'}>{tarot.name}</span>
    </span>
  );
}

import type { PackKind, PackSize } from '@game/durak';
import arcanaUrl from '../../../assets/pack_arcana.png';
import deckUrl from '../../../assets/pack_deck.png';
import focusesUrl from '../../../assets/pack_focuses.png';
import jokersUrl from '../../../assets/pack_jokers.png';
import { PACK_NAMES, PACK_SIZE_NAMES } from './shopCopy';

/** One sealed foil per kind, drawn 106x142 (the transparent rows are cut, stretched to the slot height) with the kind's emblem and an empty label plate. */
const PACK_FOILS: Readonly<Record<PackKind, string>> = { jokers: jokersUrl, arcana: arcanaUrl, focuses: focusesUrl, deck: deckUrl };

/**
 * A sealed foil booster: the foil of its kind, the size on its plate. Without a size (the opening screen) the plate
 * names the kind instead.
 */
export function PackArt({ kind, size }: { readonly kind: PackKind; readonly size?: PackSize }) {
  return (
    <span className={`pack pack--${kind} pack--${size ?? 'normal'}`}>
      <img className="sprite pack__foil" src={PACK_FOILS[kind]} alt="" draggable={false} />
      <span className="pack__label">{size ? PACK_SIZE_NAMES[size] : PACK_NAMES[kind]}</span>
    </span>
  );
}

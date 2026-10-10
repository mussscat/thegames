import type { PackKind, PackSize } from '@game/durak';
import packBigUrl from '../../../assets/pack_bg_big.png';
import packMegaUrl from '../../../assets/pack_bg_mega.png';
import packNormalUrl from '../../../assets/pack_bg_normal.png';
import { packBackdropUrl } from '../../../ui/pixel/cardArt';
import { PACK_NAMES, PACK_SIZE_NAMES, packSizeText } from './shopCopy';

/** One foil per size. */
const PACK_FOILS: Readonly<Record<PackSize, string>> = { normal: packNormalUrl, big: packBigUrl, mega: packMegaUrl };

/**
 * A sealed foil booster: the foil of its size, a fan of three of the kind's card backs (no pack emblems were drawn,
 * so the colour of the cards tells the kind), the name and «N карт · бери K».
 */
/** Without a size (the opening screen) the pack shows the normal foil and no size label. */
export function PackArt({ kind, size }: { readonly kind: PackKind; readonly size?: PackSize }) {
  const back = packBackdropUrl(kind);
  const foil = PACK_FOILS[size ?? 'normal'];
  return (
    <span className={`pack pack--${kind} pack--${size ?? 'normal'}`}>
      <img className="sprite pack__foil" src={foil} alt="" draggable={false} />
      {back && (
        <span className="pack__fan" aria-hidden="true">
          <img className="sprite pack__card pack__card--left" src={back} alt="" draggable={false} />
          <img className="sprite pack__card pack__card--right" src={back} alt="" draggable={false} />
          <img className="sprite pack__card pack__card--middle" src={back} alt="" draggable={false} />
        </span>
      )}
      <span className="pack__name">{PACK_NAMES[kind]}</span>
      {size && <span className="pack__size">{PACK_SIZE_NAMES[size]}</span>}
      {size && <span className="pack__count">{packSizeText(size)}</span>}
    </span>
  );
}

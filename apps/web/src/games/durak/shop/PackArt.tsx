import type { PackKind, PackSize } from '@game/durak';
import { PACK_NAMES, PACK_SIZE_NAMES, packSizeText } from './shopCopy';

/** A sealed foil booster: colour by kind, size and «N карт · бери K» on the front. */
export function PackArt({ kind, size }: { readonly kind: PackKind; readonly size?: PackSize }) {
  return (
    <span className={`pack pack--${kind}${size ? ` pack--${size}` : ''}`}>
      <span className="pack__foil" />
      <span className="pack__name">{PACK_NAMES[kind]}</span>
      {size && <span className="pack__size">{PACK_SIZE_NAMES[size]}</span>}
      {size && <span className="pack__count">{packSizeText(size)}</span>}
    </span>
  );
}

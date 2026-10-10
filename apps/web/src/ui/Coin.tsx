import { coinUrl, type CoinKind } from './pixel/uiArt';

/** The coin sprite, as tall as the text around it; a plain bullet if the sprite is not available. */
export function Coin({ kind = 'face' }: { readonly kind?: CoinKind }) {
  const url = coinUrl(kind);
  if (!url) return <span aria-hidden="true">●</span>;
  return <img className="coin" src={url} alt="" draggable={false} />;
}

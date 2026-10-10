import type { IconId } from './pixel/sheet';
import { iconUrl } from './pixel/uiArt';

type IconProps = {
  readonly id: IconId;
  /** Shown instead of the picture if the sprite is not available; the picture alone is decorative. */
  readonly fallback?: string;
};

/** An interface icon, one text line high. */
export function Icon({ id, fallback }: IconProps) {
  const url = iconUrl(id);
  if (!url) return fallback ? <span aria-hidden="true">{fallback}</span> : null;
  return <img className="icon" src={url} alt="" draggable={false} />;
}

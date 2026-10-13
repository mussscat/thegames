import { toArtRect, type ArtRect, type StageFrame } from '../ui/pixelScale';

export type Anchor = { readonly x: number; readonly top: number; readonly bottom: number };

/** The tip's anchor point for an element's screen rect, in stage coordinates (art pixels inside a stage, screen px outside). */
export function anchorIn(rect: ArtRect, frame: StageFrame): Anchor {
  const r = toArtRect(rect, frame);
  return { x: r.left + r.width / 2, top: r.top, bottom: r.top + r.height };
}

/** How far a bubble of `width`, centred on `x`, must move to stay `edge` inside `[0, limit]`. */
export function tipShift(x: number, width: number, limit: number, edge: number): number {
  const left = x - width / 2;
  const right = x + width / 2;
  if (left < edge) return edge - left;
  if (right > limit - edge) return limit - edge - right;
  return 0;
}

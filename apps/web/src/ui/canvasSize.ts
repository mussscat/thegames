/** Backing-store size in whole pixels: a fractional size never equals what the canvas stores, forcing a realloc every frame. */
export function canvasSize(clientWidth: number, clientHeight: number, dpr: number): { readonly width: number; readonly height: number } {
  return { width: Math.floor(clientWidth * dpr), height: Math.floor(clientHeight * dpr) };
}

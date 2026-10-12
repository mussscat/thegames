/**
 * Backing-store size of the swirl: one pixel per `cell` CSS px, stretched by the browser without smoothing.
 * The swirl is drawn in blocks anyway, so this looks the same as drawing every device pixel and costs a few
 * hundred times less (a 1440×900 window at 2× is 5 million shader runs per frame the other way).
 */
export function cellGridSize(clientWidth: number, clientHeight: number, cell: number): { readonly width: number; readonly height: number } {
  return { width: Math.max(1, Math.ceil(clientWidth / cell)), height: Math.max(1, Math.ceil(clientHeight / cell)) };
}

/**
 * Resolves true when `work` settles (resolved or rejected) and false if it is still pending after `ms`.
 * It never rejects, so the app can always go on to render — with the procedural fallbacks for whatever is missing.
 */
export function settleWithin(work: Promise<unknown>, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), ms);
    const settled = (): void => {
      clearTimeout(timer);
      resolve(true);
    };
    work.then(settled, settled);
  });
}

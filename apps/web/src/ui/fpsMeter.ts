export type FrameStats = { readonly avg: number; readonly p5: number };

/** Frames per second from frame-to-frame times in ms: the mean and the 5th percentile (the slow frames a player feels). */
export function summarizeFrames(deltasMs: readonly number[]): FrameStats {
  const fps = deltasMs.filter((d) => d > 0).map((d) => 1000 / d).sort((a, b) => a - b);
  if (fps.length === 0) return { avg: 0, p5: 0 };
  const avg = fps.reduce((sum, v) => sum + v, 0) / fps.length;
  const p5 = fps[Math.max(0, Math.ceil(fps.length * 0.05) - 1)] ?? 0;
  return { avg, p5 };
}

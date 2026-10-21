/** Where a card last stood on screen, by card id: the hand slot it left, read when it lands on the table. */
export type Origin = { readonly left: number; readonly top: number; readonly width: number; readonly height: number; readonly at: number };

export const ORIGIN_TTL_MS = 2000;

const origins = new Map<string, Origin>();
/** Where a card stood on the table when its place went away: read by the hand that takes the card. */
const leaves = new Map<string, Origin>();

export function rememberOrigin(id: string, rect: { left: number; top: number; width: number; height: number }, now = Date.now()): void {
  origins.set(id, { left: rect.left, top: rect.top, width: rect.width, height: rect.height, at: now });
}

export function rememberLeave(id: string, rect: { left: number; top: number; width: number; height: number }, now = Date.now()): void {
  leaves.set(id, { left: rect.left, top: rect.top, width: rect.width, height: rect.height, at: now });
}

/** The place a card left on the table, unless it is older than the TTL. Not consumed, like `takeOrigin`. */
export function takeLeave(id: string, now = Date.now()): Origin | undefined {
  const found = leaves.get(id);
  if (found && now - found.at <= ORIGIN_TTL_MS) return found;
  leaves.delete(id);
  return undefined;
}

/**
 * The remembered origin, unless it is older than the TTL. Not consumed: React's dev StrictMode runs an effect twice,
 * and the second run must find the same origin.
 */
export function takeOrigin(id: string, now = Date.now()): Origin | undefined {
  const found = origins.get(id);
  if (found && now - found.at <= ORIGIN_TTL_MS) return found;
  origins.delete(id);
  return undefined;
}

const claimed = new Map<string, number>();

/** A card that landed somewhere new says it used its origin, so the place it left does not play a "gone" animation. */
export function markClaimed(id: string, now = Date.now()): void {
  claimed.set(id, now);
}

/** Whether `id` was claimed at or after `since`. */
export function wasClaimed(id: string, since: number): boolean {
  const at = claimed.get(id);
  return at !== undefined && at >= since;
}

export type FlightPlan = {
  readonly dx: number;
  readonly dy: number;
  readonly scale: number;
  readonly tilt: number;
};

/**
 * The start pose of a flight, in the target's own (unscaled) coordinates: `stageScale` is the stage's screen scale,
 * so a screen-pixel gap is divided by it. `scale` is how much bigger/smaller the source sprite was on screen.
 */
export function planFlight(from: Origin, to: { left: number; top: number; width: number; height: number }, stageScale: number): FlightPlan {
  const k = stageScale > 0 ? stageScale : 1;
  const dx = (from.left + from.width / 2 - (to.left + to.width / 2)) / k;
  const dy = (from.top + from.height / 2 - (to.top + to.height / 2)) / k;
  const scale = to.width > 0 ? from.width / to.width : 1;
  return { dx, dy, scale, tilt: Math.max(-14, Math.min(14, dx * 0.08)) };
}

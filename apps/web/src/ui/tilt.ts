type Rect = { readonly left: number; readonly top: number; readonly width: number; readonly height: number };

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** How far a card leans towards a pointer: the card tilts to ±tilt/2 at its edges and no further, however far off the pointer is. */
export function tiltAngles(x: number, y: number, rect: Rect, tilt: number): { rotateX: number; rotateY: number } {
  if (rect.width <= 0 || rect.height <= 0) return { rotateX: 0, rotateY: 0 };
  const fx = clamp((x - rect.left) / rect.width - 0.5, -0.5, 0.5);
  const fy = clamp((y - rect.top) / rect.height - 0.5, -0.5, 0.5);
  return { rotateX: -fy * tilt, rotateY: fx * tilt };
}

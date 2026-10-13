import type { HTMLAttributes } from 'react';
import { panelClass, type PanelKind } from './classes';

type PixelPanelProps = HTMLAttributes<HTMLDivElement> & { readonly kind?: PanelKind };

/** A 9-slice frame from the kit: the corners stay crisp, only the flat middle stretches. */
export function PixelPanel({ kind = 'panel', className, ...rest }: PixelPanelProps) {
  return <div className={panelClass(kind, className)} {...rest} />;
}

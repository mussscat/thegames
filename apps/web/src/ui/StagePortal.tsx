import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useStage } from './StageContext';

/** A portal that lands inside the pixel stage (so it is scaled with it), or on `document.body` when there is none. */
export function StagePortal({ children }: { readonly children: ReactNode }) {
  const { root } = useStage();
  return createPortal(children, root ?? document.body);
}

import type { HTMLAttributes } from 'react';
import { textClass, type TextSize } from './classes';
import './pixel-text.css';

type PixelTextProps = HTMLAttributes<HTMLSpanElement> & { readonly size?: TextSize };

/** m6x11 text at one of the three sizes that sit on the font's grid, with the hard one-pixel shadow. */
export function PixelText({ size = 'm', className, ...rest }: PixelTextProps) {
  return <span className={textClass(size, className)} {...rest} />;
}

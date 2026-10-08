import type { ButtonHTMLAttributes, MouseEvent } from 'react';
import { useSettings } from './SettingsContext';

export type ButtonTone = 'blue' | 'red' | 'orange' | 'green';

type PixelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly tone?: ButtonTone;
  readonly small?: boolean;
};

/** Blue — neutral, red — main fight action, orange — purchases, green — reroll / continue. */
export function PixelButton({ tone = 'blue', small = false, className, onClick, type = 'button', ...rest }: PixelButtonProps) {
  const { play } = useSettings();
  const classes = ['pbtn', `pbtn--${tone}`, small ? 'pbtn--small' : '', className ?? ''].filter(Boolean).join(' ');
  const click = (event: MouseEvent<HTMLButtonElement>): void => {
    play('select');
    onClick?.(event);
  };
  return <button type={type} className={classes} onClick={click} {...rest} />;
}

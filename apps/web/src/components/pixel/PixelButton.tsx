import type { ButtonHTMLAttributes, MouseEvent } from 'react';
import { useSettings } from '../../ui/SettingsContext';
import { buttonClass, type ButtonTone } from './classes';

type PixelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly tone?: ButtonTone;
  /** 36 art px high instead of the large 44. */
  readonly small?: boolean;
};

/**
 * A kit button. Blue — neutral, red — the main fight action, orange — purchases, green — reroll / continue.
 * The picture changes with `:active` and `:disabled` in CSS; the label sits one art pixel lower while pressed.
 */
export function PixelButton({ tone = 'blue', small = false, className, onClick, type = 'button', children, ...rest }: PixelButtonProps) {
  const { play } = useSettings();
  const click = (event: MouseEvent<HTMLButtonElement>): void => {
    play('select');
    onClick?.(event);
  };
  return (
    <button type={type} className={buttonClass(tone, small, className)} onClick={click} {...rest}>
      <span>{children}</span>
    </button>
  );
}

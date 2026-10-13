import { iconClass, type IconName } from './classes';

/** A kit icon at its native size (never scaled); decorative unless `label` is given. */
export function PixelIcon({ name, label }: { readonly name: IconName; readonly label?: string }) {
  return <span className={iconClass(name)} data-sprite={`icon-${name}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}

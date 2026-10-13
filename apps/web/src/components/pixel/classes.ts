export type ButtonTone = 'blue' | 'red' | 'orange' | 'green';
export type PanelKind = 'panel' | 'window' | 'tip';
export type TextSize = 's' | 'm' | 'l';
export type IconName = 'deck' | 'chip' | 'mult' | 'heart' | 'coin' | 'skull';

/** Kit class of a button: large (44 art px) by default, small (36) with `small`. */
export function buttonClass(tone: ButtonTone, small: boolean, extra = ''): string {
  return ['px-button', `px-button-${tone}-${small ? 's' : 'l'}`, extra].filter(Boolean).join(' ');
}

export function panelClass(kind: PanelKind, extra = ''): string {
  return [`px-${kind}`, extra].filter(Boolean).join(' ');
}

export function textClass(size: TextSize, extra = ''): string {
  return ['px-text', `px-text-${size}`, extra].filter(Boolean).join(' ');
}

export function iconClass(name: IconName): string {
  return `px-icon-${name}`;
}

/**
 * Width of a bar's fill in whole art pixels. A fill with hp left is never empty and one that is not full never looks
 * full, so the bar tells the truth at both ends; bad input reads as an empty bar.
 */
export function barFill(hp: number, maxHp: number, inner: number): number {
  if (!Number.isFinite(hp) || !Number.isFinite(maxHp) || maxHp <= 0 || inner <= 0 || hp <= 0) return 0;
  if (hp >= maxHp) return inner;
  return Math.min(inner - 1, Math.max(1, Math.round((hp / maxHp) * inner)));
}

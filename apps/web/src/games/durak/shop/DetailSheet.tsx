import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PixelButton } from '../../../ui/PixelButton';

type DetailSheetProps = {
  readonly title: string;
  readonly subtitle?: string;
  readonly text: string;
  readonly warning?: string | null;
  readonly art: ReactNode;
  readonly actions: ReactNode;
  /** Extra content under the text (the tarot target hand). */
  readonly children?: ReactNode;
  /** null — the sheet cannot be dismissed (a bought tarot waits for «Применить» / «Пропустить»). */
  readonly onClose: (() => void) | null;
};

/** A bottom sheet on phones (a centred card on wide screens): big art, text, and the actions in thumb reach. */
export function DetailSheet({ title, subtitle, text, warning = null, art, actions, children, onClose }: DetailSheetProps) {
  return createPortal(
    <div className="sheet-backdrop" data-testid="detail-sheet" onClick={onClose ?? undefined}>
      <div className="sheet panel" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="sheet__art">{art}</div>
        <h3 className="sheet__title">{title}</h3>
        {subtitle && <p className="sheet__subtitle">{subtitle}</p>}
        <p className="sheet__text">{text}</p>
        {children}
        {warning && (
          <p className="sheet__warning" role="alert">
            {warning}
          </p>
        )}
        <div className="sheet__actions">
          {actions}
          {onClose && (
            <PixelButton tone="blue" onClick={onClose}>
              Закрыть
            </PixelButton>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

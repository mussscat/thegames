import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PixelButton } from '../../../ui/PixelButton';
import { StagePortal } from '../../../ui/StagePortal';

type DetailSheetProps = {
  readonly title: string;
  readonly subtitle?: string;
  readonly text: string;
  readonly warning?: string | null;
  readonly art: ReactNode;
  /** A function gets `close` — it plays the exit animation, then calls onClose and the optional `then`. */
  readonly actions: ReactNode | ((close: (then?: () => void) => void) => ReactNode);
  /** Extra content under the text (the tarot target hand). */
  readonly children?: ReactNode;
  /** null — the sheet cannot be dismissed (a bought tarot waits for «Применить» / «Пропустить»). */
  readonly onClose: (() => void) | null;
};

/** The exit animation in shop.css lasts 0.15s; the timer is a fallback when animationend never fires. */
const EXIT_FALLBACK_MS = 250;

/** A bottom sheet on phones (a centred card on wide screens): big art, text, and the actions in thumb reach. */
export function DetailSheet({ title, subtitle, text, warning = null, art, actions, children, onClose }: DetailSheetProps) {
  const [closing, setClosing] = useState(false);
  const finished = useRef(false);
  /** Runs once the exit animation is over: a full-screen layer that must not cover the closing sheet (a bought pack). */
  const afterClose = useRef<(() => void) | null>(null);
  const close = (then?: () => void): void => {
    if (!onClose) return;
    afterClose.current = then ?? null;
    setClosing(true);
  };
  const finish = (): void => {
    if (finished.current) return;
    finished.current = true;
    onClose?.();
    afterClose.current?.();
  };
  useEffect(() => {
    if (!closing) return undefined;
    const timer = window.setTimeout(finish, EXIT_FALLBACK_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);
  return (
    <StagePortal>
    <div className={closing ? 'sheet-backdrop sheet-backdrop--closing' : 'sheet-backdrop'} data-testid="detail-sheet" onClick={() => close()}>
      <div
        className={closing ? 'sheet panel sheet--closing' : 'sheet panel'}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        onAnimationEnd={(event) => {
          if (closing && event.target === event.currentTarget) finish();
        }}
      >
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
          {typeof actions === 'function' ? actions(close) : actions}
          {onClose && (
            <PixelButton tone="blue" onClick={() => close()}>
              Закрыть
            </PixelButton>
          )}
        </div>
      </div>
    </div>
    </StagePortal>
  );
}

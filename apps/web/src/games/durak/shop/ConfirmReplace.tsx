import { ENHANCEMENTS } from '@game/durak';
import { PixelButton } from '../../../ui/PixelButton';
import { PixelCard } from '../../../ui/PixelCard';
import type { Replacement } from './opening';
import { deckCard } from './shopCopy';

type ConfirmReplaceProps = { readonly changes: readonly Replacement[]; readonly onConfirm: () => void; readonly onCancel: () => void };

/** «Острая → Золотая»: the card as it is in the deck and as it will be, side by side. */
export function ConfirmReplace({ changes, onConfirm, onCancel }: ConfirmReplaceProps) {
  return (
    <div className="confirm-backdrop" onClick={(event) => event.stopPropagation()}>
      <div className="confirm panel" role="alertdialog" aria-label="Замена усиления">
        <h3 className="confirm__title">Заменить усиление?</h3>
        {changes.map((change) => {
          const card = deckCard(change.cardId);
          return (
            card && (
              <div key={change.cardId} className="confirm__row">
                <PixelCard card={card} width={56} enhancement={change.from} idle={false} />
                <span className="confirm__text">
                  {ENHANCEMENTS[change.from].name} → {ENHANCEMENTS[change.to].name}
                </span>
                <PixelCard card={card} width={56} enhancement={change.to} idle={false} />
              </div>
            )
          );
        })}
        <div className="confirm__actions">
          <PixelButton tone="orange" onClick={onConfirm}>
            Заменить
          </PixelButton>
          <PixelButton tone="blue" onClick={onCancel}>
            Отмена
          </PixelButton>
        </div>
      </div>
    </div>
  );
}

import { FOCUSES, focusSellPrice, MAX_FOCUSES, packCardRarity, type FocusId, type PackCard, type RunAction } from '@game/durak';
import type { MouseEvent } from 'react';
import { CardTip, useCardTip } from '../../../components/CardTip';
import { PixelButton } from '../../../ui/PixelButton';
import { PixelText } from '../../../components/pixel/PixelText';
import { FeelBox } from '../../../ui/FeelBox';
import { DetailSheet } from './DetailSheet';
import { OwnedSlot } from './OwnedSlot';
import { PackCardFace } from './PackCardFace';
import { cardTipLines, RARITY_NAMES } from './shopCopy';

function FocusSlot({ id, selected, onSelect }: { readonly id: FocusId; readonly selected: boolean; readonly onSelect: () => void }) {
  const { anchor, handlers } = useCardTip(true, false);
  return (
    <>
      <button type="button" className="owned__card" aria-label={FOCUSES[id].name} aria-pressed={selected} onClick={onSelect} {...handlers}>
        <FeelBox>
          <PackCardFace card={{ kind: 'focus', focusId: id }} />
        </FeelBox>
      </button>
      {anchor && <CardTip anchor={anchor} lines={cardTipLines({ kind: 'focus', focusId: id }, {})} />}
    </>
  );
}

type FocusSheetProps = { readonly id: FocusId; readonly onClose: () => void; readonly onSell: () => void };

/** A tapped owned focus: big card, its rule, and the sell button. */
function FocusSheet({ id, onClose, onSell }: FocusSheetProps) {
  const card: PackCard = { kind: 'focus', focusId: id };
  return (
    <DetailSheet
      title={FOCUSES[id].name}
      subtitle={RARITY_NAMES[packCardRarity(card)]}
      text={FOCUSES[id].description}
      art={<PackCardFace card={card} size="big" />}
      onClose={onClose}
      actions={(close) => (
        <PixelButton
          tone="orange"
          onClick={() => {
            onSell();
            close();
          }}
        >
          Продать за {focusSellPrice(id)}
        </PixelButton>
      )}
    />
  );
}

type OwnedFocusesProps = {
  readonly focuses: readonly FocusId[];
  readonly selected: number | null;
  readonly onSelect: (slot: number | null) => void;
  readonly onAct: (action: RunAction) => void;
};

/** The player's two focus slots in the shop; a tap selects one to sell. */
export function OwnedFocuses({ focuses, selected, onSelect, onAct }: OwnedFocusesProps) {
  const stop = (event: MouseEvent): void => event.stopPropagation();
  const chosen = selected === null ? undefined : focuses[selected];
  return (
    <section className="owned owned--focuses panel" data-testid="owned-focuses" aria-label="Твои фокусы" onClick={stop}>
      <h2 className="owned__title">
        <PixelText>Фокусы</PixelText>
      </h2>
      <span className="owned__count">
        <PixelText>
          {focuses.length}/{MAX_FOCUSES}
        </PixelText>
      </span>
      <ul className="owned__list">
        {Array.from({ length: MAX_FOCUSES }, (_, slot) => {
          const id = focuses[slot];
          return (
            <OwnedSlot key={slot} className="owned-focus" itemKey={id} layoutId={`focus-${id}`}>
              {id && <FocusSlot id={id} selected={selected === slot} onSelect={() => onSelect(selected === slot ? null : slot)} />}
            </OwnedSlot>
          );
        })}
      </ul>
      {chosen && selected !== null && (
        <FocusSheet
          id={chosen}
          onClose={() => onSelect(null)}
          onSell={() => onAct({ type: 'sellFocus', slot: selected })}
        />
      )}
    </section>
  );
}

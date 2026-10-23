import { JOKERS, MAX_JOKERS, packCardRarity, sellPrice, type JokerId, type PackCard, type RunAction } from '@game/durak';
import type { MouseEvent } from 'react';
import { CardTip, useCardTip } from '../../../components/CardTip';
import { PixelButton } from '../../../ui/PixelButton';
import { PixelText } from '../../../components/pixel/PixelText';
import { FeelBox } from '../../../ui/FeelBox';
import { JokerFace } from '../JokerFace';
import { DetailSheet } from './DetailSheet';
import { OwnedSlot } from './OwnedSlot';
import { PackCardFace } from './PackCardFace';
import { cardTipLines, RARITY_NAMES } from './shopCopy';

type OwnedJokerProps = { readonly id: JokerId; readonly selected: boolean; readonly onSelect: () => void };

function OwnedJoker({ id, selected, onSelect }: OwnedJokerProps) {
  const { anchor, handlers } = useCardTip(true, false);
  return (
    <>
      <button type="button" className="owned__card" aria-label={JOKERS[id].name} aria-pressed={selected} onClick={onSelect} {...handlers}>
        <FeelBox>
          <JokerFace id={id} />
        </FeelBox>
      </button>
      {anchor && <CardTip anchor={anchor} lines={cardTipLines({ kind: 'joker', jokerId: id }, {})} />}
    </>
  );
}

type JokerSheetProps = { readonly id: JokerId; readonly onClose: () => void; readonly onSell: () => void };

/** A tapped owned joker: big card, its rule from the menu, and the sell button. */
function JokerSheet({ id, onClose, onSell }: JokerSheetProps) {
  const card: PackCard = { kind: 'joker', jokerId: id };
  return (
    <DetailSheet
      title={JOKERS[id].name}
      subtitle={RARITY_NAMES[packCardRarity(card)]}
      text={JOKERS[id].description}
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
          Продать за {sellPrice(id)}
        </PixelButton>
      )}
    />
  );
}

type OwnedJokersProps = {
  readonly jokers: readonly JokerId[];
  readonly selected: JokerId | null;
  readonly onSelect: (id: JokerId | null) => void;
  readonly onAct: (action: RunAction) => void;
};

/** The owned jokers on top, in equal slots; a tap opens a sheet with the big card and the sell button. */
export function OwnedJokers({ jokers, selected, onSelect, onAct }: OwnedJokersProps) {
  const stop = (event: MouseEvent): void => event.stopPropagation();
  return (
    <section className="owned panel" data-testid="owned-jokers" aria-label="Твои джокеры" onClick={stop}>
      <h2 className="owned__title">
        <PixelText>Джокеры</PixelText>
      </h2>
      <span className="owned__count">
        <PixelText>
          {jokers.length}/{MAX_JOKERS}
        </PixelText>
      </span>
      <ul className="owned__list">
        {Array.from({ length: MAX_JOKERS }, (_, slot) => {
          const id = jokers[slot];
          return (
            <OwnedSlot key={slot} className="owned__slot" itemKey={id} layoutId={`joker-${id}`}>
              {id && <OwnedJoker id={id} selected={id === selected} onSelect={() => onSelect(id === selected ? null : id)} />}
            </OwnedSlot>
          );
        })}
      </ul>
      {selected && (
        <JokerSheet
          id={selected}
          onClose={() => onSelect(null)}
          onSell={() => onAct({ type: 'sellJoker', jokerId: selected })}
        />
      )}
    </section>
  );
}

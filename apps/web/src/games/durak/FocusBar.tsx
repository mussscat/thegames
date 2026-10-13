import { FOCUSES, MAX_FOCUSES, type FocusId } from '@game/durak';
import { CardTip, useCardTip } from '../../components/CardTip';
import { focusArtUrl } from '../../ui/pixel/cardArt';
import { FocusFace } from './FocusFace';
import { FOCUS_GLYPHS } from './shop/PackCardFace';
import { cardTipLines } from './shop/shopCopy';

export type FocusPick = { readonly slot: number; readonly targets: readonly string[] };

function FocusChip({ id, selected, onSelect }: { readonly id: FocusId; readonly selected: boolean; readonly onSelect: () => void }) {
  const { anchor, handlers } = useCardTip(true, false);
  return (
    <li className={selected ? 'focus-chip focus-chip--selected' : 'focus-chip'}>
      <button type="button" className="focus-chip__face" aria-label={FOCUSES[id].name} aria-pressed={selected} onClick={onSelect} {...handlers}>
        {focusArtUrl(id) ? <FocusFace id={id} /> : <span className="focus-chip__glyph">{FOCUS_GLYPHS[id]}</span>}
        <span className="focus-chip__name">{FOCUSES[id].name}</span>
      </button>
      {anchor && <CardTip anchor={anchor} lines={cardTipLines({ kind: 'focus', focusId: id }, {})} />}
    </li>
  );
}

type FocusBarProps = {
  readonly focuses: readonly FocusId[];
  readonly pick: FocusPick | null;
  readonly onPick: (pick: FocusPick | null) => void;
};

/** The focus slots next to the joker stack: a tap selects one; Сыграть / Отмена live in the bottom action row. */
export function FocusBar({ focuses, pick, onPick }: FocusBarProps) {
  if (focuses.length === 0) return null;
  return (
    <section className="focus-bar" data-testid="focus-bar" aria-label="Фокусы">
      <ul className="focus-bar__list">
        {Array.from({ length: MAX_FOCUSES }, (_, slot) => {
          const focus = focuses[slot];
          return focus ? (
            <FocusChip key={`${focus}-${slot}`} id={focus} selected={pick?.slot === slot} onSelect={() => onPick(pick?.slot === slot ? null : { slot, targets: [] })} />
          ) : (
            <li key={`empty-${slot}`} className="focus-chip focus-chip--empty" aria-hidden="true" />
          );
        })}
      </ul>
    </section>
  );
}

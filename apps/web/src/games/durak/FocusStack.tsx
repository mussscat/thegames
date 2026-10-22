import { FOCUSES, MAX_FOCUSES, type FocusId } from '@game/durak';
import { focusArtUrl } from '../../ui/pixel/cardArt';
import { FocusFace } from './FocusFace';
import { FOCUS_GLYPHS } from './shop/PackCardFace';
import './focusStack.css';

type FocusStackProps = {
  readonly focuses: readonly FocusId[];
  /** Slot of the focus picked to be played (it stands lifted), or null. */
  readonly pickedSlot: number | null;
  readonly onOpen: () => void;
};

/** The player's focuses as one pile under the jokers: the first slot on top, a «1/2» tag, a tap opens the sheet. An empty pile shows the hole. */
export function FocusStack({ focuses, pickedSlot, onOpen }: FocusStackProps) {
  return (
    <button type="button" className="fstack" data-testid="focus-stack" aria-label={`Фокусы: ${focuses.length} из ${MAX_FOCUSES}`} disabled={focuses.length === 0} onClick={onOpen}>
      <span className="fstack__pile">
        {focuses.length === 0 && <span className="fstack__hole" aria-hidden="true" />}
        {focuses.map((id, slot) => (
          <span
            key={`${id}-${slot}`}
            className={slot === pickedSlot ? 'fstack__card fstack__card--picked' : 'fstack__card'}
            style={{ zIndex: MAX_FOCUSES - slot, translate: `${-(focuses.length - 1 - slot) * 3}px ${-(focuses.length - 1 - slot) * 3}px` }}
          >
            {focusArtUrl(id) ? <FocusFace id={id} /> : <span className="fstack__glyph" title={FOCUSES[id].name}>{FOCUS_GLYPHS[id]}</span>}
          </span>
        ))}
      </span>
      <span className="fstack__count">
        {focuses.length}/{MAX_FOCUSES}
      </span>
    </button>
  );
}

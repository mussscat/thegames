import { FOCUSES, packCardRarity, TAROTS, type FocusId, type PackCard, type TarotId } from '@game/durak';
import { PixelCard } from '../../../ui/PixelCard';
import { focusArtUrl, tarotArtUrl } from '../../../ui/pixel/cardArt';
import { FocusFace } from '../FocusFace';
import { JokerFace } from '../JokerFace';
import { TarotFace } from '../TarotFace';
import { deckCard } from './shopCopy';

const TAROT_GLYPHS: Readonly<Record<TarotId, string>> = { sun: '☀', tower: '♜', star: '★', chariot: '♞', emperor: '♔', death: '☠', hermit: '☾', wheel: '☸' };
export const FOCUS_GLYPHS: Readonly<Record<FocusId, string>> = { peek: '◎', foresight: '✧', redeal: '↻', boost: '▲', pad: '◆', shield: '⬡', piggy: '¤', swap: '⇄', doubler: '×2', suitShift: '♤' };
const CARD_WIDTH = { slot: 76, big: 104 } as const;

type PackCardFaceProps = { readonly card: PackCard; readonly size?: 'slot' | 'big'; readonly faceDown?: boolean };

/** One card of the shop or a pack: a joker picture, a tarot or an enhanced playing card, framed by rarity. */
export function PackCardFace({ card, size = 'slot', faceDown = false }: PackCardFaceProps) {
  const classes = ['shop-card', `shop-card--${size}`, `shop-card--${packCardRarity(card)}`, faceDown ? 'shop-card--down' : ''].filter(Boolean).join(' ');
  if (faceDown) return <span className={classes} aria-hidden="true" />;
  if (card.kind === 'card') {
    const playing = deckCard(card.cardId);
    return <span className={`${classes} shop-card--playing`}>{playing && <PixelCard card={playing} width={CARD_WIDTH[size]} enhancement={card.enhancement} />}</span>;
  }
  if (card.kind === 'joker') {
    return (
      <span className={`${classes} shop-card--joker`}>
        <JokerFace id={card.jokerId} />
      </span>
    );
  }
  if (card.kind === 'focus' && focusArtUrl(card.focusId)) {
    return (
      <span className={`${classes} shop-card--focus-art`}>
        <FocusFace id={card.focusId} />
      </span>
    );
  }
  if (card.kind === 'focus') {
    return (
      <span className={`${classes} shop-card--focus`}>
        <span className="shop-card__glyph">{FOCUS_GLYPHS[card.focusId]}</span>
        <span className="shop-card__name">{FOCUSES[card.focusId].name}</span>
      </span>
    );
  }
  if (tarotArtUrl(card.tarotId)) {
    return (
      <span className={`${classes} shop-card--tarot-art`}>
        <TarotFace id={card.tarotId} />
      </span>
    );
  }
  const tarot = TAROTS[card.tarotId];
  return (
    <span className={`${classes} shop-card--tarot`}>
      <span className="shop-card__numeral">{tarot.numeral}</span>
      <span className="shop-card__glyph">{TAROT_GLYPHS[card.tarotId]}</span>
      <span className="shop-card__name">{tarot.name}</span>
    </span>
  );
}

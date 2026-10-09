import { JOKERS, packCardRarity, TAROTS, type PackCard, type TarotId } from '@game/durak';
import { PixelCard } from '../../../ui/PixelCard';
import { emblemUrl } from '../../../ui/pixel/jokerEmblem';
import { deckCard } from './shopCopy';

const TAROT_GLYPHS: Readonly<Record<TarotId, string>> = { sun: '☀', tower: '♜', star: '★', chariot: '♞', emperor: '♔', death: '☠', hermit: '☾', wheel: '☸' };
const CARD_WIDTH = { slot: 76, big: 104 } as const;

type PackCardFaceProps = { readonly card: PackCard; readonly size?: 'slot' | 'big'; readonly faceDown?: boolean };

/** One card of the shop or a pack: a joker picture, a tarot or an enhanced playing card, framed by rarity. */
export function PackCardFace({ card, size = 'slot', faceDown = false }: PackCardFaceProps) {
  const classes = ['shop-card', `shop-card--${size}`, `shop-card--${packCardRarity(card)}`, faceDown ? 'shop-card--down' : ''].filter(Boolean).join(' ');
  if (faceDown) return <span className={classes} aria-hidden="true" />;
  if (card.kind === 'card') {
    const playing = deckCard(card.cardId);
    return <span className={`${classes} shop-card--playing`}>{playing && <PixelCard card={playing} width={CARD_WIDTH[size]} enhancement={card.enhancement} idle={false} />}</span>;
  }
  if (card.kind === 'joker') {
    return (
      <span className={`${classes} shop-card--joker`}>
        <img className="sprite shop-card__art" src={emblemUrl(card.jokerId)} alt="" draggable={false} />
        <span className="shop-card__name">{JOKERS[card.jokerId].name}</span>
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

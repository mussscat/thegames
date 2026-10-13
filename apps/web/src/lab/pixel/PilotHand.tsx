import jokerCommon from '../../assets/joker_bg_common.png';
import jokerLegendary from '../../assets/joker_bg_legendary.png';
import jokerRare from '../../assets/joker_bg_rare.png';
import tricksCommon from '../../assets/tricks_bg_common.png';
import tricksRare from '../../assets/tricks_bg_rare.png';

const CARDS: readonly { readonly url: string; readonly w: number; readonly h: number; readonly name: string }[] = [
  { url: jokerCommon, w: 106, h: 144, name: 'joker-common' },
  { url: jokerRare, w: 106, h: 144, name: 'joker-rare' },
  { url: jokerLegendary, w: 106, h: 144, name: 'joker-legendary' },
  { url: tricksCommon, w: 107, h: 150, name: 'tricks-common' },
  { url: tricksRare, w: 108, h: 150, name: 'tricks-rare' },
  { url: jokerRare, w: 106, h: 144, name: 'joker-rare' },
  { url: jokerCommon, w: 106, h: 144, name: 'joker-common' },
];
const MARGIN = 6;

/** The visible strip of every card but the last, in whole art pixels; the index (rank + suit) must fit in it. */
export function handStep(artW: number, cardW: number, count: number): number {
  return Math.max(1, Math.floor((artW - MARGIN * 2 - cardW) / Math.max(1, count - 1)));
}

/** Real card sprites at natural size in an overlapping hand: answers «how wide must the screen be in art pixels». */
export function PilotHand({ artW, artH, count }: { readonly artW: number; readonly artH: number; readonly count: number }) {
  const cards = CARDS.slice(0, count);
  const step = handStep(artW, 106, cards.length);
  return (
    <>
      {cards.map((card, i) => (
        <img
          key={i}
          className="pp-hand-card"
          src={card.url}
          alt=""
          draggable={false}
          data-sprite={card.name}
          style={{ left: `calc(var(--u) * ${MARGIN + i * step})`, top: `calc(var(--u) * ${artH - card.h - 6})`, width: `calc(var(--u) * ${card.w})`, height: `calc(var(--u) * ${card.h})` }}
        />
      ))}
      <p className="pp-hand-note">полоса индекса: {step} px арта</p>
    </>
  );
}

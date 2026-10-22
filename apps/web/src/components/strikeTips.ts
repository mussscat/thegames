import { ENHANCEMENTS, JOKERS, type CardPart, type CardScore } from '@game/durak';
import type { TipLine } from './tipLines';

function chipsWord(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'фишек';
  if (last === 1) return 'фишка';
  return last >= 2 && last <= 4 ? 'фишки' : 'фишек';
}

function partName(part: CardPart): string {
  const { source } = part;
  if (source.kind === 'joker') return JOKERS[source.acting].name;
  if (source.kind === 'enhancement') return ENHANCEMENTS[source.enhancement].name;
  return 'ранг';
}

/** The tooltip line for a card held down: the chips it deals and where each came from (multipliers are left out on purpose). */
export function strikeTip(score: CardScore, owner: TipLine['owner']): TipLine {
  return {
    name: `+${score.chips} ${chipsWord(score.chips)}`,
    description: score.parts.map((part) => `${partName(part)} +${part.chips}`).join(' · '),
    owner,
  };
}

import { ENHANCEMENTS, type CardEnhancements, type EnhancementId } from '@game/durak';

/** `owner` — a short note after the name (whose half of a split card, a rarity, a pack size). */
export type TipLine = { readonly name: string; readonly description: string; readonly owner: string | null };

function line(id: EnhancementId, owner: TipLine['owner']): TipLine {
  return { name: ENHANCEMENTS[id].name, description: ENHANCEMENTS[id].description, owner };
}

/** What the enhancement tooltip says; the owner is named only when both halves of a split card need telling apart. */
export function tipLines(enhancements: CardEnhancements | undefined): readonly TipLine[] {
  const own = enhancements?.own;
  const foreign = enhancements?.foreign;
  if (own && foreign) return [line(own, 'твоё'), line(foreign, 'соперника')];
  const single = own ?? foreign;
  return single ? [line(single, null)] : [];
}

import { err, ok, type Card, type Result } from '@game/core';
import type { EnhancementId } from './enhancements';
import type { EnhancementSource, PlayerId, RoundState } from './types';

export type CardEnhancements = { readonly own?: EnhancementId; readonly foreign?: EnhancementId };

export type EnhancementVariant = { readonly use?: EnhancementSource; readonly enhancement?: EnhancementId };

/** Own enhancement always; plus the one the card carried in when taken from the table (if it differs). */
export function cardEnhancements(state: RoundState, holder: PlayerId, card: Card): CardEnhancements {
  const own = state.profiles[holder][card.id];
  const carried = state.carried[card.id];
  const foreign = carried && carried !== own ? carried : undefined;
  return { ...(own ? { own } : {}), ...(foreign ? { foreign } : {}) };
}

/** Two enhancements → two explicit choices; otherwise a single implicit one. */
export function enhancementVariants(options: CardEnhancements): readonly EnhancementVariant[] {
  if (options.own && options.foreign) {
    return [
      { use: 'own', enhancement: options.own },
      { use: 'foreign', enhancement: options.foreign },
    ];
  }
  return [{ enhancement: options.own ?? options.foreign }];
}

export function resolveEnhancement(
  options: CardEnhancements,
  use?: EnhancementSource,
): Result<EnhancementId | undefined, 'enhancementUnavailable'> {
  if (use === 'own') return options.own ? ok(options.own) : err('enhancementUnavailable');
  if (use === 'foreign') return options.foreign ? ok(options.foreign) : err('enhancementUnavailable');
  return ok(options.own ?? options.foreign);
}

import type { PackKind } from '@game/durak';
import arcanaA from '../assets/pack_variants/pack_arcana_a.png';
import arcanaB from '../assets/pack_variants/pack_arcana_b.png';
import deckA from '../assets/pack_variants/pack_deck_a.png';
import deckB from '../assets/pack_variants/pack_deck_b.png';
import focusesA from '../assets/pack_variants/pack_focuses_a.png';
import focusesB from '../assets/pack_variants/pack_focuses_b.png';
import jokersA from '../assets/pack_variants/pack_jokers_a.png';
import jokersB from '../assets/pack_variants/pack_jokers_b.png';
import { PackArt } from '../games/durak/shop/PackArt';
import { PACK_NAMES } from '../games/durak/shop/shopCopy';

type Variant = { readonly kind: PackKind; readonly id: string; readonly url: string };

/** Pixellab drafts 106x142, cut from the art size of a card (106x144), edited from the shop foil: each kind with its own emblem (two seeds per kind). */
const VARIANTS: readonly Variant[] = [
  { kind: 'jokers', id: 'A', url: jokersA },
  { kind: 'jokers', id: 'B', url: jokersB },
  { kind: 'arcana', id: 'A', url: arcanaA },
  { kind: 'arcana', id: 'B', url: arcanaB },
  { kind: 'focuses', id: 'A', url: focusesA },
  { kind: 'focuses', id: 'B', url: focusesB },
  { kind: 'deck', id: 'A', url: deckA },
  { kind: 'deck', id: 'B', url: deckB },
];

/** A draft pack as the shop would draw it: the sprite, the kind's name on its empty plate (the foil layout of `.pack`). */
function VariantPack({ variant }: { readonly variant: Variant }) {
  return (
    <figure className="lab__variant">
      <span className={`pack pack--${variant.kind}`}>
        <img className="sprite pack__foil" src={variant.url} alt="" draggable={false} />
        <span className="pack__label">{PACK_NAMES[variant.kind]}</span>
      </span>
      <figcaption>
        {PACK_NAMES[variant.kind]} {variant.id}
      </figcaption>
    </figure>
  );
}

/** The current packs next to the generated drafts, to judge the cropping and the emblems on a device. */
export function PackVariants() {
  return (
    <section>
      <h3>Сейчас в магазине</h3>
      <div className="lab__variants">
        {(['jokers', 'arcana', 'focuses', 'deck'] as const).map((kind) => (
          <div key={kind} className="lab__variant lab__variant--current">
            <PackArt kind={kind} size="big" />
          </div>
        ))}
      </div>
      <h3>Варианты (pixellab)</h3>
      <div className="lab__variants">
        {VARIANTS.map((variant) => (
          <VariantPack key={`${variant.kind}${variant.id}`} variant={variant} />
        ))}
      </div>
    </section>
  );
}

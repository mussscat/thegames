import { formatMult, type HitInfo } from './hits';

/** Big damage number with a small Balatro-like board under it: blue chips × red mult. */
export function HitPop({ hit }: { readonly hit: HitInfo }) {
  return (
    <span className="hit-pop">
      <span className="hit-pop__damage">−{hit.damage}</span>
      {hit.chips !== null && hit.mult !== null && (
        <span className="hit-pop__board" aria-label={`${hit.chips} фишек × ${formatMult(hit.mult)}`}>
          <span className="hit-pop__chips">{hit.chips}</span>
          <span className="hit-pop__times">×</span>
          <span className="hit-pop__mult">{formatMult(hit.mult)}</span>
        </span>
      )}
    </span>
  );
}

import type { PackKind } from '@game/durak';
import type { CSSProperties } from 'react';
import { TEAR_MS } from './opening';
import { PackArt } from './PackArt';

/** The glow that bursts out of the tear, in the colour of the pack. */
const FLASH: Readonly<Record<PackKind, string>> = { jokers: '#8fb8ff', arcana: '#ffd36b', focuses: '#6fffd0', deck: '#ff7a7a' };

/**
 * A sealed pack that tears open: it flies in and shakes harder, the crimped top strip tears off and flies away, a flash
 * bursts from the tear and the body sinks and fades. The parent swaps it for the cards once TEAR_MS / speed has passed.
 */
export function PackTear({ kind, speed }: { readonly kind: PackKind; readonly speed: number }) {
  const style = { '--tear-ms': `${TEAR_MS / speed}ms`, '--flash': FLASH[kind] } as CSSProperties;
  return (
    <span className="tear" style={style} aria-hidden="true">
      <span className="tear__body">
        <PackArt kind={kind} />
      </span>
      <span className="tear__top">
        <PackArt kind={kind} />
      </span>
      <span className="tear__flash" />
    </span>
  );
}

export interface GuardEvent {
  readonly target: unknown;
  readonly ctrlKey?: boolean;
  preventDefault(): void;
}

export interface GuardSource {
  addEventListener(type: string, listener: (event: GuardEvent) => void, options?: { passive?: boolean }): void;
  removeEventListener(type: string, listener: (event: GuardEvent) => void): void;
}

/** Text fields keep selection and the context menu; everything else in the game does not. */
export function isEditable(target: unknown): boolean {
  if (typeof target !== 'object' || target === null) return false;
  const node = target as { tagName?: unknown; type?: unknown; isContentEditable?: unknown };
  if (node.isContentEditable === true) return true;
  if (node.tagName === 'TEXTAREA') return true;
  return node.tagName === 'INPUT' && (node.type === 'text' || node.type === 'search' || node.type === 'number' || node.type === 'password');
}

const CANCEL_OUTSIDE_FIELDS = ['contextmenu', 'dragstart', 'selectstart'] as const;
/** Safari ignores `user-scalable=no`; pinch arrives as these events. */
const CANCEL_ALWAYS = ['gesturestart', 'gesturechange', 'gestureend'] as const;

/** Switches off the browser's own gestures; returns the function that removes the guards again. */
export function installShellGuards(source: GuardSource): () => void {
  const outsideFields = (event: GuardEvent): void => {
    if (!isEditable(event.target)) event.preventDefault();
  };
  const always = (event: GuardEvent): void => event.preventDefault();
  const ctrlWheel = (event: GuardEvent): void => {
    if (event.ctrlKey) event.preventDefault();
  };

  const installed: ReadonlyArray<readonly [string, (event: GuardEvent) => void]> = [
    ...CANCEL_OUTSIDE_FIELDS.map((type) => [type, outsideFields] as const),
    ...CANCEL_ALWAYS.map((type) => [type, always] as const),
    ['wheel', ctrlWheel],
  ];
  for (const [type, listener] of installed) {
    // `wheel` must be non-passive, otherwise preventDefault is ignored.
    source.addEventListener(type, listener, type === 'wheel' ? { passive: false } : undefined);
  }
  return () => {
    for (const [type, listener] of installed) source.removeEventListener(type, listener);
  };
}

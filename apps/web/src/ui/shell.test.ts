import { describe, expect, it, vi } from 'vitest';
import { installShellGuards, isEditable, type GuardEvent, type GuardSource } from './shell';

function fakeSource() {
  const listeners = new Map<string, (event: GuardEvent) => void>();
  const options = new Map<string, { passive?: boolean } | undefined>();
  const source: GuardSource = {
    addEventListener: (type, listener, opts) => {
      listeners.set(type, listener);
      options.set(type, opts);
    },
    removeEventListener: (type) => {
      listeners.delete(type);
    },
  };
  const fire = (type: string, event: Partial<GuardEvent> & { target?: unknown } = {}): boolean => {
    const preventDefault = vi.fn();
    listeners.get(type)?.({ target: { tagName: 'DIV' }, preventDefault, ...event });
    return preventDefault.mock.calls.length > 0;
  };
  return { source, fire, listeners, options };
}

describe('isEditable', () => {
  it('is true for text fields and contenteditable, false for everything else', () => {
    expect(isEditable({ tagName: 'INPUT', type: 'text' })).toBe(true);
    expect(isEditable({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isEditable({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(isEditable({ tagName: 'IMG' })).toBe(false);
    expect(isEditable({ tagName: 'INPUT', type: 'range' })).toBe(false);
    expect(isEditable(null)).toBe(false);
    expect(isEditable(undefined)).toBe(false);
  });
});

describe('installShellGuards', () => {
  it.each(['contextmenu', 'dragstart', 'selectstart'])('cancels %s on content but not in a text field', (type) => {
    const { source, fire } = fakeSource();
    installShellGuards(source);
    expect(fire(type, { target: { tagName: 'IMG' } })).toBe(true);
    expect(fire(type, { target: { tagName: 'INPUT', type: 'text' } })).toBe(false);
  });

  it.each(['gesturestart', 'gesturechange', 'gestureend'])('always cancels %s (Safari pinch zoom)', (type) => {
    const { source, fire } = fakeSource();
    installShellGuards(source);
    expect(fire(type)).toBe(true);
  });

  it('cancels ctrl+wheel zoom but leaves a plain wheel alone', () => {
    const { source, fire } = fakeSource();
    installShellGuards(source);
    expect(fire('wheel', { ctrlKey: true })).toBe(true);
    expect(fire('wheel', { ctrlKey: false })).toBe(false);
  });

  it('registers wheel as non-passive, otherwise preventDefault is ignored', () => {
    const { source, options } = fakeSource();
    installShellGuards(source);
    expect(options.get('wheel')).toEqual({ passive: false });
  });

  it('removes every listener on uninstall', () => {
    const { source, listeners } = fakeSource();
    const uninstall = installShellGuards(source);
    expect(listeners.size).toBeGreaterThan(0);
    uninstall();
    expect(listeners.size).toBe(0);
  });
});

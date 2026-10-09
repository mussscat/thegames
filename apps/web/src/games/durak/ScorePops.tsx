import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSettings } from '../../ui/SettingsContext';
import { playScoreTick } from '../../ui/sound';
import { anchorFor, targetSelector, type ScoreTarget } from './scoreTimeline';
import type { Playback } from './useScorePlayback';

const BOUNCE_MAX_MS = 260;

function bounce(target: ScoreTarget, duration: number): void {
  const element = document.querySelector(targetSelector(target));
  element?.animate(
    [{ transform: 'translateY(0)' }, { transform: 'translateY(-12%) scale(1.08)' }, { transform: 'translateY(0)' }],
    { duration: Math.min(BOUNCE_MAX_MS, duration), easing: 'ease-out' },
  );
}

/** Floating labels over the scored elements, their bounces and ticks, and a full-screen tap-to-skip. */
export function ScorePops({ playback }: { readonly playback: Playback }) {
  const { settings } = useSettings();
  const reduced = useReducedMotion() ?? false;
  const { active, index, current, skip } = playback;

  useEffect(() => {
    if (!current) return;
    if (!reduced) current.bounce.forEach((target) => bounce(target, current.duration));
    if (current.tone !== 'final') playScoreTick(index, current.tone === 'times', settings.sound);
  }, [current, index, reduced, settings.sound]);

  const rect = useMemo(
    () => (current ? (anchorFor(current.pop, (selector) => document.querySelector(selector))?.getBoundingClientRect() ?? null) : null),
    [current],
  );

  if (!active) return null;
  // The final sits on its HP bar, not above it, so it never covers the neighbouring bar.
  const centred = current?.pop.kind === 'hp';
  return createPortal(
    <>
      <button type="button" className="score-skip" data-testid="score-skip" aria-label="Пропустить подсчёт" onClick={skip} />
      <AnimatePresence>
        {current && rect && (
          <span
            key={index}
            className={centred ? 'score-pop-anchor score-pop-anchor--centre' : 'score-pop-anchor'}
            style={{ left: rect.left + rect.width / 2, top: centred ? rect.top + rect.height / 2 : rect.top }}
          >
            <motion.span
              data-testid="score-pop"
              className={`score-pop score-pop--${current.tone}`}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.5 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: -14, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {current.label}
            </motion.span>
          </span>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}

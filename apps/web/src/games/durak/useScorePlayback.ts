import type { ScoredHit } from '@game/durak';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnimSpeed } from '../../ui/settings';
import { boardAt, playbackCues, scoreTimeline, type Board, type Timeline, type TimelineEvent } from './scoreTimeline';

export type Playback = {
  readonly active: boolean;
  /** The event on screen (-1: the board just appeared). */
  readonly index: number;
  readonly current: TimelineEvent | null;
  readonly board: Board | null;
  readonly skip: () => void;
};

type Shown = { readonly timeline: Timeline; readonly index: number };

/** Plays a scored take: one event per cue, then `onDone`. A skip restarts the cues from the final. */
export function useScorePlayback(score: ScoredHit | null, speed: AnimSpeed, onDone: () => void): Playback {
  const timeline = useMemo(() => (score ? scoreTimeline(score, speed) : null), [score, speed]);
  const [shown, setShown] = useState<Shown | null>(null);
  const [skipped, setSkipped] = useState<Timeline | null>(null);
  const done = useRef(onDone);
  done.current = onDone;

  const finalIndex = timeline ? timeline.events.length - 1 : 0;
  const from = timeline && skipped === timeline ? finalIndex : 0;

  useEffect(() => {
    if (!timeline) return undefined;
    const { cues, doneAt } = playbackCues(timeline, from);
    const timers = cues.map((cue) => window.setTimeout(() => setShown({ timeline, index: cue.index }), cue.at));
    timers.push(window.setTimeout(() => done.current(), doneAt));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [timeline, from]);

  if (!timeline) return { active: false, index: -1, current: null, board: null, skip: () => undefined };
  const index = shown?.timeline === timeline ? shown.index : -1;
  return {
    active: true,
    index,
    current: timeline.events[index] ?? null,
    board: boardAt(timeline, index),
    skip: () => {
      if (skipped !== timeline) setSkipped(timeline);
    },
  };
}

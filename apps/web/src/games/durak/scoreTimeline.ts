import { CARD_JOKERS, type PlayerId, type ScoredHit, type ScoreStep } from '@game/durak';
import type { AnimSpeed } from '../../ui/settings';
import { formatMult } from './hits';

/** Durations at x1; the speed setting divides all of them. */
export const STEP_MS = 350;
export const FINAL_MS = 600;
export const BOARD_FADE_MS = 200;

export type ScoreTarget =
  | { readonly kind: 'card'; readonly cardId: string }
  | { readonly kind: 'joker'; readonly side: PlayerId; readonly slot: number }
  | { readonly kind: 'tier' }
  | { readonly kind: 'hp'; readonly side: PlayerId };

export type PopTone = 'chips' | 'mult' | 'times' | 'final';

/** One beat of the show: a label pops over `pop`, the `bounce` elements jump, the board shows chips/mult after it. */
export type TimelineEvent = {
  readonly at: number;
  readonly duration: number;
  readonly pop: ScoreTarget;
  readonly bounce: readonly ScoreTarget[];
  readonly label: string;
  readonly tone: PopTone;
  readonly chips: number;
  readonly mult: number;
  readonly damage: number | null;
};

export type Timeline = { readonly events: readonly TimelineEvent[]; readonly end: number };
export type Board = { readonly chips: number; readonly mult: number; readonly damage: number | null };

const other = (side: PlayerId): PlayerId => (side === 'player' ? 'enemy' : 'player');

function labelOf(effect: ScoreStep['effect']): string {
  switch (effect.kind) {
    case 'chips':
      return `+${formatMult(effect.value)}`;
    case 'mult':
      return `+${formatMult(effect.value)} множ.`;
    case 'times':
      return `×${formatMult(effect.value)}`;
  }
}

type Beat = Pick<TimelineEvent, 'pop' | 'bounce'>;

/** Where a step pops and what jumps; per-card jokers pop over the card scored just before them. */
function beatOf(step: ScoreStep, taker: PlayerId, lastCard: string | null): Beat {
  const { source } = step;
  switch (source.kind) {
    case 'tier':
      return { pop: { kind: 'tier' }, bounce: [] };
    case 'card':
    case 'enhancement': {
      const card: ScoreTarget = { kind: 'card', cardId: source.card.id };
      return { pop: card, bounce: [card] };
    }
    case 'joker': {
      const ticket: ScoreTarget = { kind: 'joker', side: source.side === 'attacker' ? other(taker) : taker, slot: source.slot };
      const onCard = lastCard !== null && CARD_JOKERS.includes(source.acting);
      return { pop: onCard ? { kind: 'card', cardId: lastCard } : ticket, bounce: [ticket] };
    }
  }
}

function lastCardAfter(step: ScoreStep, previous: string | null): string | null {
  return step.source.kind === 'card' ? step.source.card.id : previous;
}

/** Turns a scored take into timed events: board fade-in, one beat per step, then the final. */
export function scoreTimeline(score: ScoredHit, speed: AnimSpeed): Timeline {
  const step = STEP_MS / speed;
  const fade = BOARD_FADE_MS / speed;
  const beats = score.steps.reduce<{ readonly events: readonly TimelineEvent[]; readonly lastCard: string | null }>(
    (acc, s, i) => {
      const event: TimelineEvent = {
        at: fade + i * step,
        duration: step,
        ...beatOf(s, score.target, acc.lastCard),
        label: labelOf(s.effect),
        tone: s.effect.kind,
        chips: s.chips,
        mult: s.mult,
        damage: null,
      };
      return { events: [...acc.events, event], lastCard: lastCardAfter(s, acc.lastCard) };
    },
    { events: [], lastCard: null },
  );
  const final: TimelineEvent = {
    at: fade + score.steps.length * step,
    duration: FINAL_MS / speed,
    pop: { kind: 'hp', side: score.target },
    bounce: [],
    label: `−${score.damage}`,
    tone: 'final',
    chips: score.chips,
    mult: score.mult,
    damage: score.damage,
  };
  return { events: [...beats.events, final], end: final.at + final.duration + fade };
}

/** The board after event `index` (-1: before the first step). */
export function boardAt(timeline: Timeline, index: number): Board {
  const event = timeline.events[index];
  return event ? { chips: event.chips, mult: event.mult, damage: event.damage } : { chips: 0, mult: 1, damage: null };
}

/** Timers to run from event `from` on (0 — the whole show; the last index — a skip to the final). */
export function playbackCues(timeline: Timeline, from: number) {
  // From the start the board fade-in comes first; a skip jumps straight to its event.
  const offset = from > 0 ? (timeline.events[from]?.at ?? 0) : 0;
  const cues = timeline.events.slice(from).map((event, i) => ({ at: event.at - offset, index: from + i }));
  return { cues, doneAt: timeline.end - offset };
}

/** Where a tap leads: to the final, or — when the final is already showing — straight to the end. */
export function skipTarget(timeline: Timeline, index: number): number | 'done' {
  const finalIndex = timeline.events.length - 1;
  return index >= finalIndex ? 'done' : finalIndex;
}

export const BOARD_SELECTOR = '[data-score-board]';

export function targetSelector(target: ScoreTarget): string {
  switch (target.kind) {
    case 'card':
      return `[data-score-card="${target.cardId}"]`;
    case 'joker':
      return `[data-score-joker="${target.side}-${target.slot}"]`;
    case 'tier':
      return '[data-score-tier]';
    case 'hp':
      return `[data-score-hp="${target.side}"]`;
  }
}

/** The element to pop over: the target, or the board when the target is not on screen. */
export function anchorFor<T>(target: ScoreTarget, query: (selector: string) => T | null): T | null {
  return query(targetSelector(target)) ?? query(BOARD_SELECTOR);
}

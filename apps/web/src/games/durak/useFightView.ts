import type { Card } from '@game/core';
import {
  applyFocus,
  currentActor,
  FOCUSES,
  focusReady,
  type EnhancementSource,
  type FightAction,
  type FightState,
  type RunState,
  type ScoredHit,
} from '@game/durak';
import { useEffect, useState } from 'react';
import { useSettings } from '../../ui/SettingsContext';
import { usePrevious } from '../../ui/usePrevious';
import { type FocusAction } from './ActionBar';
import { type FocusPick } from './FocusBar';
import { playLabel, toggleTarget } from './focusView';
import { fightSound, isNewError } from './sounds';
import { useScorePlayback } from './useScorePlayback';

export type FightViewInput = {
  readonly fight: FightState;
  readonly errorSeq: number;
  readonly run: RunState;
  readonly scoring: ScoredHit | null;
  readonly onScoringDone: () => void;
  readonly onFightAction: (action: FightAction) => void;
  readonly onUseFocus: (slot: number, targets: readonly string[]) => void;
};

/** Everything a fight screen needs besides markup: sounds, the scoring playback, whose turn it is, focus picking, the joker sheet. */
export function useFightView({ fight, errorSeq, run, scoring, onScoringDone, onFightAction, onUseFocus }: FightViewInput) {
  const { settings, play: playSfx } = useSettings();
  const { round } = fight;
  const previous = usePrevious(fight);
  useEffect(() => {
    if (!previous || previous === fight) return;
    const sound = fightSound(previous, fight);
    if (sound) playSfx(sound);
  }, [fight, previous, playSfx]);
  const previousErrorSeq = usePrevious(errorSeq);
  useEffect(() => {
    if (isNewError(previousErrorSeq, errorSeq)) playSfx('deny');
  }, [errorSeq, previousErrorSeq, playSfx]);
  const playback = useScorePlayback(scoring, settings.animSpeed, onScoringDone);
  const myTurn = !playback.active && !fight.winner && currentActor(round) === 'player';
  const defending = myTurn && round.attacker === 'enemy';
  const focuses = run.focuses;
  const [focusPick, setFocusPick] = useState<FocusPick | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // The scoring show needs the stack on screen: it closes the sheet.
  useEffect(() => {
    if (playback.active) setSheetOpen(false);
  }, [playback.active]);
  useEffect(() => setFocusPick(null), [fight.roundNumber]);
  const pickedId = focusPick ? focuses[focusPick.slot] : undefined;
  const targeting =
    focusPick && pickedId && FOCUSES[pickedId].maxTargets > 0
      ? { picked: focusPick.targets, onPick: (card: Card) => setFocusPick({ ...focusPick, targets: toggleTarget(focusPick.targets, card.id, FOCUSES[pickedId].maxTargets) }) }
      : null;
  const focusAction: FocusAction | null =
    focusPick && pickedId
      ? {
          label: playLabel(pickedId, focusPick.targets.length),
          ready: myTurn && focusReady(fight, pickedId) && applyFocus(fight, pickedId, focusPick.targets).ok,
          onPlay: () => {
            onUseFocus(focusPick.slot, focusPick.targets);
            setFocusPick(null);
          },
          onCancel: () => setFocusPick(null),
        }
      : null;
  const play = (card: Card, use?: EnhancementSource): void => {
    const base = defending ? { type: 'defend' as const, cardId: card.id } : { type: 'attack' as const, cardId: card.id };
    onFightAction(use ? { ...base, use } : base);
  };
  return { settings, round, playback, myTurn, focuses, focusPick, setFocusPick, sheetOpen, setSheetOpen, targeting, focusAction, play };
}

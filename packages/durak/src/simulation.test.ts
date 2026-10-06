import { createRng } from '@game/core';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { chooseAction, type AiStyle } from './ai';
import { dealRound } from './deal';
import { applyFightAction, createFight, type FightAction, type FightState } from './fight';
import { applyRoundAction } from './reducer';
import { currentActor } from './rules';
import type { PlayerId, RoundState } from './types';

const DECK_SIZE = 36;
const MAX_ROUND_STEPS = 2_000;
const MAX_FIGHT_STEPS = 50_000;

const seedArb = fc.integer({ min: 0, max: 0xffffffff });
const styleArb = fc.constantFrom<AiStyle>('stingy', 'aggressive');

function visibleCards(state: RoundState) {
  return [
    ...state.deck,
    ...state.hands.player,
    ...state.hands.enemy,
    ...state.table.flatMap((pair) => (pair.defense ? [pair.attack, pair.defense] : [pair.attack])),
  ];
}

describe('AI vs AI simulation', () => {
  it('every round ends, no card is lost or duplicated, AI only plays legal moves', () => {
    fc.assert(
      fc.property(seedArb, styleArb, styleArb, (seed, playerStyle, enemyStyle) => {
        const styles: Record<PlayerId, AiStyle> = { player: playerStyle, enemy: enemyStyle };
        let [state] = dealRound(createRng(seed));
        for (let step = 0; step < MAX_ROUND_STEPS && !state.outcome; step++) {
          const actor = currentActor(state);
          if (!actor) throw new Error('no actor in an unfinished round');
          const action = chooseAction(state, actor, styles[actor]);
          if (!action) throw new Error(`AI returned no action for ${actor}`);
          const result = applyRoundAction(state, actor, action);
          if (!result.ok) throw new Error(`illegal AI move ${JSON.stringify(action)}: ${result.error}`);
          state = result.value;
          const cards = visibleCards(state);
          expect(cards.length + state.discardCount).toBe(DECK_SIZE);
          expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
        }
        expect(state.outcome).not.toBeNull();
      }),
      { numRuns: 200 },
    );
  });

  it('every fight ends with a winner and HP within bounds', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        let fight: FightState = createFight({ seed, playerHp: 15, enemyHp: 10 });
        for (let step = 0; step < MAX_FIGHT_STEPS && !fight.winner; step++) {
          const actor = currentActor(fight.round);
          const action: FightAction | null = actor ? chooseAction(fight.round, actor, 'stingy') : { type: 'nextRound' };
          if (!action) throw new Error('AI returned no action');
          const result = applyFightAction(fight, actor ?? 'player', action);
          if (!result.ok) throw new Error(`illegal move: ${result.error}`);
          fight = result.value;
          expect(fight.hp.player).toBeGreaterThanOrEqual(0);
          expect(fight.hp.enemy).toBeGreaterThanOrEqual(0);
        }
        expect(fight.winner).not.toBeNull();
      }),
      { numRuns: 50 },
    );
  });
});

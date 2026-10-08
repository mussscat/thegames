import { err, ok, type Card, type Result } from '@game/core';
import type { EnhancementId } from './enhancements';
import { cardEnhancements, resolveEnhancement } from './origin';
import { canBeatWith, canThrowIn, currentActor, defenderOf, uncoveredPair } from './rules';
import {
  opponentOf,
  withHand,
  type BoutResult,
  type DurakError,
  type EnhancementSource,
  type Carried,
  type PlayerId,
  type RoundAction,
  type RoundState,
} from './types';

type RoundResult = Result<RoundState, DurakError>;
type Played = { readonly card: Card; readonly enhancement: EnhancementId | undefined };

export function applyRoundAction(state: RoundState, actor: PlayerId, action: RoundAction): RoundResult {
  if (state.outcome) return err('roundOver');
  if (currentActor(state) !== actor) return err('notYourTurn');
  switch (action.type) {
    case 'attack':
      return attack(state, actor, action.cardId, action.use);
    case 'defend':
      return defend(state, actor, action.cardId, action.use);
    case 'take':
      return take(state, actor);
    case 'endAttack':
      return endAttack(state, actor);
  }
}

function withoutCard(hand: readonly Card[], cardId: string): readonly Card[] {
  return hand.filter((card) => card.id !== cardId);
}

function withoutCarried(carried: Carried, cardIds: readonly string[]): Carried {
  return Object.fromEntries(Object.entries(carried).filter(([id]) => !cardIds.includes(id)));
}

/** Finds the card in the actor's hand and resolves which enhancement it is played with. */
function pick(state: RoundState, actor: PlayerId, cardId: string, use?: EnhancementSource): Result<Played, DurakError> {
  const card = state.hands[actor].find((candidate) => candidate.id === cardId);
  if (!card) return err('cardNotInHand');
  const enhancement = resolveEnhancement(cardEnhancements(state, actor, card), use);
  return enhancement.ok ? ok({ card, enhancement: enhancement.value }) : enhancement;
}

/** Removes the played card from hand; the enhancement it was played with is fixed for the actor this round. */
function afterPlay(state: RoundState, actor: PlayerId, card: Card, enhancement: EnhancementId | undefined): RoundState {
  const fixed = enhancement ? { ...state.fixed, [actor]: { ...state.fixed[actor], [card.id]: enhancement } } : state.fixed;
  return {
    ...state,
    hands: withHand(state.hands, actor, withoutCard(state.hands[actor], card.id)),
    carried: withoutCarried(state.carried, [card.id]),
    fixed,
  };
}

function attack(state: RoundState, actor: PlayerId, cardId: string, use?: EnhancementSource): RoundResult {
  if (actor !== state.attacker) return err('notYourTurn');
  const played = pick(state, actor, cardId, use);
  if (!played.ok) return played;
  const { card, enhancement } = played.value;
  if (!canThrowIn(state, card)) return err('cannotThrowIn');
  const pair = { attack: card, defense: null, ...(enhancement ? { attackEnh: enhancement } : {}) };
  return ok({ ...afterPlay(state, actor, card, enhancement), table: [...state.table, pair] });
}

function defend(state: RoundState, actor: PlayerId, cardId: string, use?: EnhancementSource): RoundResult {
  const pair = uncoveredPair(state);
  if (actor !== defenderOf(state) || !pair) return err('notYourTurn');
  const played = pick(state, actor, cardId, use);
  if (!played.ok) return played;
  const { card, enhancement } = played.value;
  if (!canBeatWith(pair.attack, card, enhancement, state.trumpSuit, state.boss, actor, pair.attackEnh)) {
    return err('cannotBeat');
  }
  const covered = { ...pair, defense: card, ...(enhancement ? { defenseEnh: enhancement } : {}) };
  return ok({ ...afterPlay(state, actor, card, enhancement), table: state.table.map((p) => (p === pair ? covered : p)) });
}

function take(state: RoundState, actor: PlayerId): RoundResult {
  if (actor !== defenderOf(state)) return err('notYourTurn');
  return ok({ ...state, defenderTaking: true });
}

function endAttack(state: RoundState, actor: PlayerId): RoundResult {
  if (actor !== state.attacker) return err('notYourTurn');
  if (state.table.length === 0) return err('cannotEndAttack');
  return ok(finishBout(state));
}

function finishBout(state: RoundState): RoundState {
  const defender = defenderOf(state);
  const tableCards = state.table.flatMap((pair) => (pair.defense ? [pair.attack, pair.defense] : [pair.attack]));
  const cleared: RoundState = state.defenderTaking
    ? { ...state, hands: withHand(state.hands, defender, [...state.hands[defender], ...tableCards]) }
    : { ...state, discardCount: state.discardCount + tableCards.length };
  const drawn = drawAll(cleared, state.attacker);
  return checkRoundEnd({
    ...drawn,
    lastBout: boutResult(state),
    carried: state.defenderTaking ? takenCarried(state) : withoutCarried(state.carried, tableCards.map((card) => card.id)),
    table: [],
    defenderTaking: false,
    attacker: state.defenderTaking ? state.attacker : defender,
  });
}

/** Every taken card keeps the enhancement it was played with — attacks and the taker's own defenses alike. */
function takenCarried(state: RoundState): Carried {
  const tableIds = state.table.flatMap((pair) => (pair.defense ? [pair.attack.id, pair.defense.id] : [pair.attack.id]));
  return state.table.reduce<Carried>((carried, pair) => {
    const withAttack = pair.attackEnh ? { ...carried, [pair.attack.id]: pair.attackEnh } : carried;
    return pair.defense && pair.defenseEnh ? { ...withAttack, [pair.defense.id]: pair.defenseEnh } : withAttack;
  }, withoutCarried(state.carried, tableIds));
}

/** Records a take: the defender and every attack card it takes; a beaten bout records nothing. */
function boutResult(state: RoundState): BoutResult | null {
  return state.defenderTaking
    ? {
        damaged: defenderOf(state),
        attackCards: state.table.map((pair) => pair.attack),
        goldenHits: state.table.filter((pair) => pair.attackEnh === 'golden').length,
      }
    : null;
}

function drawAll(state: RoundState, firstDrawer: PlayerId): RoundState {
  return [firstDrawer, opponentOf(firstDrawer)].reduce<RoundState>((current, id) => {
    const need = Math.max(0, current.handSizes[id] - current.hands[id].length);
    return {
      ...current,
      deck: current.deck.slice(need),
      hands: withHand(current.hands, id, [...current.hands[id], ...current.deck.slice(0, need)]),
    };
  }, state);
}

function checkRoundEnd(state: RoundState): RoundState {
  if (state.deck.length > 0) return state;
  const playerCards = state.hands.player.length;
  const enemyCards = state.hands.enemy.length;
  if (playerCards > 0 && enemyCards > 0) return state;
  if (playerCards === 0 && enemyCards === 0) return { ...state, outcome: { loser: null, cardsLeft: 0 } };
  const loser: PlayerId = playerCards === 0 ? 'enemy' : 'player';
  return { ...state, outcome: { loser, cardsLeft: state.hands[loser].length } };
}

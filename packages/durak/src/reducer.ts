import { err, ok, type Card, type Result } from '@game/core';
import { beats, canThrowIn, currentActor, defenderOf, uncoveredPair } from './rules';
import {
  opponentOf,
  withHand,
  type BoutResult,
  type DurakError,
  type PlayerId,
  type RoundAction,
  type RoundState,
} from './types';

type RoundResult = Result<RoundState, DurakError>;

export function applyRoundAction(state: RoundState, actor: PlayerId, action: RoundAction): RoundResult {
  if (state.outcome) return err('roundOver');
  if (currentActor(state) !== actor) return err('notYourTurn');
  switch (action.type) {
    case 'attack':
      return attack(state, actor, action.cardId);
    case 'defend':
      return defend(state, actor, action.cardId);
    case 'take':
      return take(state, actor);
    case 'endAttack':
      return endAttack(state, actor);
  }
}

function findCard(hand: readonly Card[], cardId: string): Card | undefined {
  return hand.find((card) => card.id === cardId);
}

function withoutCard(hand: readonly Card[], cardId: string): readonly Card[] {
  return hand.filter((card) => card.id !== cardId);
}

function attack(state: RoundState, actor: PlayerId, cardId: string): RoundResult {
  if (actor !== state.attacker) return err('notYourTurn');
  const card = findCard(state.hands[actor], cardId);
  if (!card) return err('cardNotInHand');
  if (!canThrowIn(state, card)) return err('cannotThrowIn');
  return ok({
    ...state,
    hands: withHand(state.hands, actor, withoutCard(state.hands[actor], cardId)),
    table: [...state.table, { attack: card, defense: null }],
  });
}

function defend(state: RoundState, actor: PlayerId, cardId: string): RoundResult {
  const pair = uncoveredPair(state);
  if (actor !== defenderOf(state) || !pair) return err('notYourTurn');
  const card = findCard(state.hands[actor], cardId);
  if (!card) return err('cardNotInHand');
  if (!beats(pair.attack, card, state.trumpSuit)) return err('cannotBeat');
  return ok({
    ...state,
    hands: withHand(state.hands, actor, withoutCard(state.hands[actor], cardId)),
    table: state.table.map((p) => (p === pair ? { ...p, defense: card } : p)),
  });
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
    table: [],
    defenderTaking: false,
    attacker: state.defenderTaking ? state.attacker : defender,
  });
}

/** Taking costs the defender one HP per attack card taken; a beaten bout costs nothing. */
function boutResult(state: RoundState): BoutResult | null {
  return state.defenderTaking ? { damaged: defenderOf(state), amount: state.table.length } : null;
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

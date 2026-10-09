import { chooseAction } from '../ai';
import { MAX_JOKERS } from '../jokers/catalog';
import { currentActor } from '../rules';
import { applyRunAction, createRun, enemyAt, type RunAction, type RunState } from '../run/run';
import type { DeckProfile } from '../enhancements';
import type { OpenedPack, ShopState } from '../run/shop';
import { TAROTS, targetsOk, type TarotId } from '../shop/tarot';

const MAX_STEPS = 300_000;
const STAGES = 6;

export type FightStats = { readonly stage: number; readonly won: boolean; readonly rounds: number; readonly playerHpLeft: number; readonly maxHit: number };
export type RunStats = { readonly won: boolean; readonly stagesWon: number; readonly fights: readonly FightStats[] };

/** A plain bot: aggressive AI in fights; in the shop buys joker items, then joker and arcana packs — no synergy hunting. */
export function botAction(run: RunState): RunAction {
  const { phase } = run;
  if (phase.kind === 'fight') {
    const { fight } = phase;
    if (fight.winner) return { type: 'leaveFight' };
    const actor = currentActor(fight.round);
    if (!actor) return { type: 'fight', actor: 'player', action: { type: 'nextRound' } };
    const style = actor === 'player' ? 'aggressive' : enemyAt(run.stage).style;
    const action = chooseAction(fight.round, actor, style);
    if (!action) throw new Error('AI returned no action');
    return { type: 'fight', actor, action };
  }
  if (phase.kind === 'shop') return shopAction(run, phase.shop);
  throw new Error('run is over');
}

/** Packs the plain bot buys, most wanted first. */
const BOT_PACKS = ['jokers', 'arcana'] as const;

/** Simple tarot targets: the first hand cards; Смерть copies from the first enhanced one. */
export function botTargets(id: TarotId, hand: readonly string[], profile: DeckProfile): readonly string[] | null {
  if (id === 'death') {
    const source = hand.find((cardId) => profile[cardId] !== undefined);
    const target = hand.find((cardId) => cardId !== source);
    return source && target ? [target, source] : null;
  }
  const targets = hand.slice(0, TAROTS[id].maxTargets);
  return targetsOk(id, targets, profile) ? targets : null;
}

function packAction(run: RunState, opened: OpenedPack): RunAction {
  const room = run.jokers.length < MAX_JOKERS;
  const picks = opened.cards.flatMap((card, index): RunAction[] => {
    if (!card) return [];
    if (card.kind === 'joker') return room ? [{ type: 'pickFromPack', index, targets: [] }] : [];
    if (card.kind === 'card') return [{ type: 'pickFromPack', index, targets: [] }];
    const targets = botTargets(card.tarotId, opened.hand, run.profile);
    return targets ? [{ type: 'pickFromPack', index, targets }] : [];
  });
  return picks[0] ?? { type: 'skipPack' };
}

/** Buys an affordable joker item, then a joker pack, then an arcana pack; otherwise moves on. */
function shopAction(run: RunState, shop: ShopState): RunAction {
  if (shop.opened) return packAction(run, shop.opened);
  if (shop.casting) {
    const targets = botTargets(shop.casting.tarotId, shop.casting.hand, run.profile);
    return targets ? { type: 'castTarot', targets } : { type: 'skipTarot' };
  }
  const room = run.jokers.length < MAX_JOKERS;
  const item = shop.items.findIndex((entry) => entry !== null && entry.card.kind === 'joker' && room && entry.price <= run.coins);
  if (item >= 0) return { type: 'buyItem', index: item };
  const pack = BOT_PACKS.flatMap((kind) =>
    shop.packs.flatMap((entry, index) => (entry && entry.kind === kind && entry.price <= run.coins && (kind !== 'jokers' || room) ? [index] : [])),
  )[0];
  return pack === undefined ? { type: 'leaveShop' } : { type: 'buyPack', index: pack };
}

function finishedFight(before: RunState, after: RunState, maxHit: number): FightStats | null {
  if (before.phase.kind !== 'fight' || after.phase.kind === 'fight') return null;
  const { fight } = before.phase;
  return { stage: before.stage, won: fight.winner === 'player', rounds: fight.roundNumber, playerHpLeft: fight.hp.player, maxHit };
}

export function simulateRun(seed: number): RunStats {
  let run = createRun(seed);
  let maxHit = 0;
  const fights: FightStats[] = [];
  for (let step = 0; step < MAX_STEPS && run.phase.kind !== 'over'; step++) {
    const result = applyRunAction(run, botAction(run));
    if (!result.ok) throw new Error(`illegal bot move: ${result.error}`);
    const next = result.value;
    if (next.phase.kind === 'fight' && next.phase.fight.lastScore) maxHit = Math.max(maxHit, next.phase.fight.lastScore.damage);
    const done = finishedFight(run, next, maxHit);
    if (done) {
      fights.push(done);
      maxHit = 0;
    }
    run = next;
  }
  const won = run.phase.kind === 'over' && run.phase.won;
  return { won, stagesWon: fights.filter((fight) => fight.won).length, fights };
}

const pct = (part: number, whole: number): string => `${whole > 0 ? Math.round((100 * part) / whole) : 0}%`;
const mean = (values: readonly number[]): string => (values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : '-');

export function summarize(runs: readonly RunStats[]): string {
  const lines = Array.from({ length: STAGES }, (_, stage) => {
    const at = runs.flatMap((run) => run.fights.filter((fight) => fight.stage === stage));
    const won = at.filter((fight) => fight.won);
    return `stage ${stage + 1}: reached ${pct(at.length, runs.length)}, won ${pct(won.length, at.length)}, rounds ${mean(at.map((f) => f.rounds))}, hp left ${mean(won.map((f) => f.playerHpLeft))}, max hit ${mean(at.map((f) => f.maxHit))}`;
  });
  return [`runs ${runs.length}, full wins ${pct(runs.filter((run) => run.won).length, runs.length)}`, ...lines].join('\n');
}

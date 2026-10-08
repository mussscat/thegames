import { chooseAction } from '../ai';
import { MAX_JOKERS } from '../jokers/catalog';
import { currentActor } from '../rules';
import { applyRunAction, createRun, enemyAt, type RunAction, type RunState } from '../run/run';

const MAX_STEPS = 300_000;
const STAGES = 6;

export type FightStats = { readonly stage: number; readonly won: boolean; readonly rounds: number; readonly playerHpLeft: number; readonly maxHit: number };
export type RunStats = { readonly won: boolean; readonly stagesWon: number; readonly fights: readonly FightStats[] };

/** A plain bot: aggressive AI in fights, buys the first affordable joker while slots are free — no synergy hunting. */
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
  if (phase.kind === 'shop') {
    const index = phase.shop.offers.findIndex((offer) => offer !== null && offer.price <= run.coins);
    return index >= 0 && run.jokers.length < MAX_JOKERS ? { type: 'buyJoker', index } : { type: 'leaveShop' };
  }
  throw new Error('run is over');
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

import { RANKS, SUITS, type Rank } from '@game/core';
import { BOSS_RULES, ENHANCEMENT_IDS, JOKER_IDS, MAX_JOKERS, RUN_SCHEDULE, type RunState } from '@game/durak';
import { z } from 'zod';

export const SAVE_VERSION = 7;

const count = z.number().int().min(0);
const rank = z.custom<Rank>((value) => typeof value === 'number' && (RANKS as readonly number[]).includes(value));
const suit = z.enum(SUITS);
const player = z.enum(['player', 'enemy']);
const card = z.object({ id: z.string(), suit, rank });
const perPlayer = z.object({ player: count, enemy: count });
const rng = z.object({ seed: z.number().int() });
const boss = z.enum(BOSS_RULES).nullable();
const enhancement = z.enum(ENHANCEMENT_IDS);
const profile = z.record(z.string(), enhancement);
const joker = z.enum(JOKER_IDS);
const jokerList = z.array(joker).max(MAX_JOKERS);
const jokerState = z.object({ rage: count, cleanStreak: count, collected: count });
const stepSource = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('tier') }),
  z.object({ kind: z.literal('card'), card }),
  z.object({ kind: z.literal('enhancement'), card, enhancement }),
  z.object({ kind: z.literal('joker'), side: z.enum(['attacker', 'defender']), slot: count, joker, acting: joker }),
]);
const step = z.object({
  source: stepSource,
  effect: z.object({ kind: z.enum(['chips', 'mult', 'times']), value: z.number() }),
  chips: z.number(),
  mult: z.number(),
});
const lastScore = z.object({ target: player, chips: z.number(), mult: z.number(), damage: count, steps: z.array(step) }).nullable();

const round = z.object({
  deck: z.array(card),
  trumpSuit: suit,
  trumpCard: card,
  hands: z.object({ player: z.array(card), enemy: z.array(card) }),
  table: z.array(
    z.object({ attack: card, defense: card.nullable(), attackEnh: enhancement.optional(), defenseEnh: enhancement.optional() }),
  ),
  attacker: player,
  defenderTaking: z.boolean(),
  discardCount: count,
  outcome: z.object({ loser: player.nullable(), cardsLeft: count }).nullable(),
  lastBout: z.object({ damaged: player, attackCards: z.array(card), takenEnhancements: z.array(enhancement.nullable()) }).nullable(),
  handSizes: perPlayer,
  boss,
  profiles: z.object({ player: profile, enemy: profile }),
  carried: z.record(z.string(), enhancement),
  fixed: z.object({ player: profile, enemy: profile }),
});

const fight = z.object({
  round,
  hp: perPlayer,
  maxHp: perPlayer,
  rng,
  roundNumber: z.number().int().min(1),
  winner: player.nullable(),
  hits: z.array(z.object({ target: player, amount: count })),
  hitSeq: count,
  jokers: z.object({ player: jokerList, enemy: jokerList }),
  baseMult: z.object({ player: z.number().positive(), enemy: z.number().positive() }),
  jokerState: z.object({ player: jokerState, enemy: jokerState }),
  lastScore,
  roundTakes: perPlayer,
  fightTakes: perPlayer,
  boss,
  cardCoins: perPlayer,
});

const reward = z.object({ base: count, hpBonus: count, interest: count, jokerBonus: count, cardBonus: count, total: count });
const shop = z.object({
  offers: z.array(z.object({ jokerId: joker, price: count }).nullable()),
  enhancementOffers: z.array(z.object({ enhancementId: enhancement, price: count, cardIds: z.array(z.string()) }).nullable()),
  rerollCost: count,
});

const phase = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('fight'), fight }),
  z.object({ kind: z.literal('shop'), shop, reward }),
  z.object({ kind: z.literal('over'), won: z.boolean() }),
]);

const run = z.object({
  seed: z.number().int(),
  rng,
  stage: z.number().int().min(0).max(RUN_SCHEDULE.length - 1),
  coins: count,
  jokers: jokerList,
  collected: count,
  profile,
  bosses: z.array(z.enum(BOSS_RULES)).max(RUN_SCHEDULE.length),
  phase,
});

const saveFile = z.object({ version: z.literal(SAVE_VERSION), run });

export function parseSave(raw: unknown): RunState | null {
  const result = saveFile.safeParse(raw);
  return result.success ? result.data.run : null;
}

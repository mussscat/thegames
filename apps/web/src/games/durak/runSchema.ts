import { RANKS, SUITS, type Rank } from '@game/core';
import { BOSS_RULES, ENHANCEMENT_IDS, MAX_PERKS, PERK_IDS, RUN_SCHEDULE, type RunState } from '@game/durak';
import { z } from 'zod';

export const SAVE_VERSION = 5;

const count = z.number().int().min(0);
const rank = z.custom<Rank>((value) => typeof value === 'number' && (RANKS as readonly number[]).includes(value));
const suit = z.enum(SUITS);
const player = z.enum(['player', 'enemy']);
const perk = z.enum(PERK_IDS);
const card = z.object({ id: z.string(), suit, rank });
const perPlayer = z.object({ player: count, enemy: count });
const rng = z.object({ seed: z.number().int() });
const boss = z.enum(BOSS_RULES).nullable();
const enhancement = z.enum(ENHANCEMENT_IDS);
const profile = z.record(z.string(), enhancement);

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
  lastBout: z.object({ damaged: player, attackCards: z.array(card), goldenHits: count }).nullable(),
  handSizes: perPlayer,
  boss,
  profiles: z.object({ player: profile, enemy: profile }),
  carried: z.record(z.string(), enhancement),
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
  perks: z.array(perk).max(MAX_PERKS),
  roundTakes: perPlayer,
  fightTakes: perPlayer,
  boss,
  cardCoins: perPlayer,
});

const reward = z.object({ base: count, hpBonus: count, interest: count, perkBonus: count, cardBonus: count, total: count });
const shop = z.object({
  offers: z.array(z.object({ perkId: perk, price: count }).nullable()),
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
  perks: z.array(perk).max(MAX_PERKS),
  profile,
  bosses: z.array(z.enum(BOSS_RULES)).max(RUN_SCHEDULE.length),
  phase,
});

const saveFile = z.object({ version: z.literal(SAVE_VERSION), run });

export function parseSave(raw: unknown): RunState | null {
  const result = saveFile.safeParse(raw);
  return result.success ? result.data.run : null;
}

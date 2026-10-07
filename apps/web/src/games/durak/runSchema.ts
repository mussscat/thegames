import { RANKS, SUITS, type Rank } from '@game/core';
import { BOSS_RULES, MAX_PERKS, PERK_IDS, RUN_SCHEDULE, type RunState } from '@game/durak';
import { z } from 'zod';

export const SAVE_VERSION = 1;

const count = z.number().int().min(0);
const rank = z.custom<Rank>((value) => typeof value === 'number' && (RANKS as readonly number[]).includes(value));
const suit = z.enum(SUITS);
const player = z.enum(['player', 'enemy']);
const perk = z.enum(PERK_IDS);
const card = z.object({ id: z.string(), suit, rank });
const perPlayer = z.object({ player: count, enemy: count });
const rng = z.object({ seed: z.number().int() });
const boss = z.enum(BOSS_RULES).nullable();

const round = z.object({
  deck: z.array(card),
  trumpSuit: suit,
  trumpCard: card,
  hands: z.object({ player: z.array(card), enemy: z.array(card) }),
  table: z.array(z.object({ attack: card, defense: card.nullable() })),
  attacker: player,
  defenderTaking: z.boolean(),
  discardCount: count,
  outcome: z.object({ loser: player.nullable(), cardsLeft: count }).nullable(),
  lastBout: z.object({ damaged: player, attackCards: z.array(card) }).nullable(),
  handSizes: perPlayer,
  boss,
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
});

const reward = z.object({ base: count, hpBonus: count, interest: count, perkBonus: count, total: count });
const shop = z.object({
  offers: z.array(z.object({ perkId: perk, price: count }).nullable()),
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
  bosses: z.array(z.enum(BOSS_RULES)).max(RUN_SCHEDULE.length),
  phase,
});

const saveFile = z.object({ version: z.literal(SAVE_VERSION), run });

export function parseSave(raw: unknown): RunState | null {
  const result = saveFile.safeParse(raw);
  return result.success ? result.data.run : null;
}

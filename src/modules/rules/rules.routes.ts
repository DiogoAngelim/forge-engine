import { Router } from "express";
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../infra/db/client";

const createRuleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  eventType: z.string().min(1),
  priority: z.number().int().default(100),
  conditions: z.record(z.any()).default({ all: [] }),
  xpAwards: z.record(z.number()).default({}),
  currencyAwards: z.record(z.number()).default({}),
  multiplierConfig: z.record(z.any()).optional(),
  timeBonusConfig: z.record(z.any()).optional(),
  streakBonusConfig: z.record(z.any()).optional(),
  isActive: z.boolean().default(true)
});

export const rulesRouter = Router();

rulesRouter.post("/rules", async (req, res) => {
  const appId = req.appContext!.appId;
  const payload = createRuleSchema.parse(req.body);

  await db.execute(sql`
    insert into reward_rules (
      id, app_id, name, description, event_type, is_active, priority,
      conditions, xp_awards, currency_awards, multiplier_config, time_bonus_config, streak_bonus_config
    ) values (
      ${randomUUID()}, ${appId}, ${payload.name}, ${payload.description ?? null}, ${payload.eventType}, ${payload.isActive}, ${payload.priority},
      ${JSON.stringify(payload.conditions)}, ${JSON.stringify(payload.xpAwards)}, ${JSON.stringify(payload.currencyAwards)},
      ${payload.multiplierConfig ? JSON.stringify(payload.multiplierConfig) : null},
      ${payload.timeBonusConfig ? JSON.stringify(payload.timeBonusConfig) : null},
      ${payload.streakBonusConfig ? JSON.stringify(payload.streakBonusConfig) : null}
    )
  `);

  const result = await db.execute(sql`select * from reward_rules where app_id = ${appId} and name = ${payload.name} order by created_at desc limit 1`);
  const rule = result.rows[0];

  res.status(201).json({ rule });
});

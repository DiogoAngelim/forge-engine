import { Router } from "express";
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../infra/db/client";

const createAchievementSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  kind: z.enum(["MILESTONE", "CONDITIONAL"]),
  tier: z.string().optional(),
  hidden: z.boolean().default(false),
  repeatable: z.boolean().default(false),
  conditions: z.record(z.any()),
  rewardConfig: z.record(z.any()).optional()
});

export const achievementsRouter = Router();

achievementsRouter.post("/achievements", async (req, res) => {
  const appId = req.appContext!.appId;
  const payload = createAchievementSchema.parse(req.body);

  await db.execute(sql`
    insert into achievements (
      id, app_id, code, name, description, kind, tier, hidden, repeatable, conditions, reward_config
    ) values (
      ${randomUUID()}, ${appId}, ${payload.code}, ${payload.name}, ${payload.description ?? null}, ${payload.kind}, ${payload.tier ?? null},
      ${payload.hidden}, ${payload.repeatable}, ${JSON.stringify(payload.conditions)}, ${payload.rewardConfig ? JSON.stringify(payload.rewardConfig) : null}
    )
  `);

  const result = await db.execute(sql`select * from achievements where app_id = ${appId} and code = ${payload.code} limit 1`);
  const achievement = result.rows[0];

  res.status(201).json({ achievement });
});

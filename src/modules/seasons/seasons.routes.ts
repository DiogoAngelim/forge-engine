import { Router } from "express";
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../infra/db/client";

const createSeasonSchema = z.object({
  name: z.string().min(2),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  resetXpOnStart: z.boolean().default(false),
  rewardConfig: z.record(z.any()).optional(),
  isActive: z.boolean().default(false)
});

export const seasonsRouter = Router();

seasonsRouter.post("/seasons", async (req, res) => {
  const appId = req.appContext!.appId;
  const payload = createSeasonSchema.parse(req.body);

  const id = randomUUID();
  await db.execute(sql`
    insert into seasons (id, app_id, name, starts_at, ends_at, reset_xp_on_start, reward_config, is_active)
    values (
      ${id}, ${appId}, ${payload.name}, ${new Date(payload.startsAt)}, ${new Date(payload.endsAt)},
      ${payload.resetXpOnStart}, ${payload.rewardConfig ? JSON.stringify(payload.rewardConfig) : null}, ${payload.isActive}
    )
  `);

  const result = await db.execute(sql`select * from seasons where id = ${id} limit 1`);
  const season = result.rows[0];

  res.status(201).json({ season });
});

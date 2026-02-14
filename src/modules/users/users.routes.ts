import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../../infra/db/client";
import { computeLevelProgress } from "../../application/engine/levelingService";
import { NotFoundError } from "../../shared/errors";

const createUserSchema = z.object({
  userId: z.string().min(1),
  attributes: z.record(z.any()).optional()
});

export const usersRouter = Router();

usersRouter.post("/users", async (req, res) => {
  const appId = req.appContext!.appId;
  const payload = createUserSchema.parse(req.body);

  await db.execute(sql`
    insert into users (id, app_id, external_id, attributes)
    values (${randomUUID()}, ${appId}, ${payload.userId}, ${payload.attributes ? JSON.stringify(payload.attributes) : null})
    on conflict (app_id, external_id)
    do update set attributes = excluded.attributes, updated_at = now()
  `);

  const userResult = await db.execute(sql`
    select * from users where app_id = ${appId} and external_id = ${payload.userId} limit 1
  `);
  const user = userResult.rows[0];

  res.status(201).json({ user });
});

usersRouter.get("/users/:id/profile", async (req, res) => {
  const appId = req.appContext!.appId;
  const externalId = req.params.id;

  const userResult = await db.execute(sql`
    select * from users where app_id = ${appId} and external_id = ${externalId} limit 1
  `);
  const user = userResult.rows[0] as { id: string } | undefined;

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const [levels, streaks, currencies, achievements] = await Promise.all([
    computeLevelProgress(appId, user.id),
    db.execute(sql`select * from streaks where app_id = ${appId} and user_id = ${user.id}`),
    db.execute(sql`
      select currency, coalesce(sum(amount), 0)::int as balance
      from currency_transactions
      where app_id = ${appId} and user_id = ${user.id}
      group by currency
    `),
    db.execute(sql`
      select ua.unlocked_at, a.code, a.name, a.tier, a.hidden
      from user_achievements ua
      join achievements a on a.id = ua.achievement_id
      where ua.app_id = ${appId}
        and ua.user_id = ${user.id}
        and ua.unlocked_at is not null
    `)
  ]);

  res.json({
    user,
    levels,
    streaks: streaks.rows,
    currencies: currencies.rows.map((row) => ({
      currency: (row as { currency: string }).currency,
      balance: Number((row as { balance: number }).balance)
    })),
    achievements: achievements.rows
      .filter((ua) => !(ua as { hidden: boolean }).hidden)
      .map((ua) => ({
        code: (ua as { code: string }).code,
        name: (ua as { name: string }).name,
        tier: (ua as { tier: string | null }).tier,
        unlockedAt: (ua as { unlocked_at: Date }).unlocked_at
      }))
  });
});

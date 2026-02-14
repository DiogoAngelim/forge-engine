import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { StreakMode } from "../../domain/enums";
import { db } from "../../infra/db/client";
import { redis } from "../../infra/cache/redis";

const PERIOD_SECONDS_BY_MODE: Record<StreakMode, number> = {
  DAILY: 24 * 60 * 60,
  WEEKLY: 7 * 24 * 60 * 60
};

export const updateStreak = async (
  appId: string,
  userId: string,
  mode: StreakMode = "DAILY",
  graceSeconds = 0
): Promise<number> => {
  await db.execute(sql`
    insert into streaks (id, app_id, user_id, mode, current_count, best_count, grace_seconds)
    values (${randomUUID()}, ${appId}, ${userId}, ${mode}, 0, 0, ${graceSeconds})
    on conflict (app_id, user_id, mode) do nothing
  `);

  const streakResult = await db.execute(sql`
    select * from streaks where app_id = ${appId} and user_id = ${userId} and mode = ${mode} limit 1
  `);
  const streak = streakResult.rows[0] as {
    id: string;
    current_count: number;
    best_count: number;
    last_qualified_at: Date | null;
    grace_seconds: number;
    freeze_count: number;
  };

  const now = new Date();
  const last = streak.last_qualified_at;
  const periodSeconds = PERIOD_SECONDS_BY_MODE[mode];

  let current = streak.current_count;

  if (!last) {
    current = 1;
  } else {
    const diffSeconds = Math.floor((now.getTime() - last.getTime()) / 1000);

    if (diffSeconds <= periodSeconds + streak.grace_seconds) {
      if (diffSeconds >= periodSeconds / 2) {
        current += 1;
      }
    } else if (streak.freeze_count > 0) {
      await db.execute(sql`update streaks set freeze_count = freeze_count - 1 where id = ${streak.id}`);
      current = Math.max(1, streak.current_count);
    } else {
      current = 1;
    }
  }

  const best = Math.max(current, streak.best_count);

  await db.execute(sql`
    update streaks
    set current_count = ${current}, best_count = ${best}, last_qualified_at = ${now}, grace_seconds = ${graceSeconds}, updated_at = now()
    where id = ${streak.id}
  `);

  const ttl = periodSeconds + graceSeconds;
  await redis.setex(`forge:streak:ttl:${appId}:${userId}:${mode}`, ttl, String(now.getTime()));

  return current;
};

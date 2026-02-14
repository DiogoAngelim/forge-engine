import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../../infra/db/client";
import { LeaderboardScope } from "../../domain/enums";
import { redis } from "../../infra/cache/redis";

const makeKey = (appId: string, metric: string, periodKey: string, scope: LeaderboardScope, leagueId?: string): string => {
  const suffix = leagueId ? `:${leagueId}` : "";
  return `forge:lb:${appId}:${scope}:${metric}:${periodKey}${suffix}`;
};

export const addLeaderboardScore = async (
  appId: string,
  userId: string,
  metric: string,
  delta: number,
  periodKey: string,
  scope: LeaderboardScope,
  leagueId?: string
): Promise<void> => {
  const key = makeKey(appId, metric, periodKey, scope, leagueId);
  const score = await redis.zincrby(key, delta, userId);

  if (leagueId) {
    await db.execute(sql`
      insert into leaderboard_entries (id, app_id, user_id, scope, metric, period_key, league_id, score)
      values (${randomUUID()}, ${appId}, ${userId}, ${scope}, ${metric}, ${periodKey}, ${leagueId}, ${Number(score)})
      on conflict do nothing
    `);
    await db.execute(sql`
      update leaderboard_entries
      set score = ${Number(score)}, updated_at = now()
      where app_id = ${appId}
        and user_id = ${userId}
        and scope = ${scope}
        and metric = ${metric}
        and period_key = ${periodKey}
        and league_id = ${leagueId}
    `);
    return;
  }

  const existing = await db.execute(sql`
    select id from leaderboard_entries
    where app_id = ${appId}
      and user_id = ${userId}
      and scope = ${scope}
      and metric = ${metric}
      and period_key = ${periodKey}
      and league_id is null
    limit 1
  `);

  if (existing.rows[0]) {
    await db.execute(sql`
      update leaderboard_entries
      set score = ${Number(score)}, updated_at = now()
      where id = ${(existing.rows[0] as { id: string }).id}
    `);
    return;
  }

  await db.execute(sql`
    insert into leaderboard_entries (id, app_id, user_id, scope, metric, period_key, league_id, score)
    values (${randomUUID()}, ${appId}, ${userId}, ${scope}, ${metric}, ${periodKey}, null, ${Number(score)})
  `);
};

export const getLeaderboard = async (
  appId: string,
  metric: string,
  periodKey: string,
  scope: LeaderboardScope,
  limit = 50,
  leagueId?: string
): Promise<Array<{ userId: string; score: number; rank: number }>> => {
  const key = makeKey(appId, metric, periodKey, scope, leagueId);
  const rows = await redis.zrevrange(key, 0, limit - 1, "WITHSCORES");

  const result: Array<{ userId: string; score: number; rank: number }> = [];
  for (let i = 0; i < rows.length; i += 2) {
    result.push({
      userId: rows[i] ?? "",
      score: Number(rows[i + 1] ?? 0),
      rank: Math.floor(i / 2) + 1
    });
  }

  return result;
};

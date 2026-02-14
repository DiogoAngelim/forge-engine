import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { TransactionSource } from "../../domain/enums";
import { db } from "../../infra/db/client";

export const distributeSeasonRewards = async (appId: string, seasonId: string): Promise<void> => {
  const leaguesResult = await db.execute(sql`select id from leagues where app_id = ${appId} and season_id = ${seasonId}`);
  const leagues = leaguesResult.rows as Array<{ id: string }>;

  for (const league of leagues) {
    const winnerResult = await db.execute(sql`
      select user_id from user_leagues where league_id = ${league.id} order by points desc limit 1
    `);
    const winner = winnerResult.rows[0] as { user_id: string } | undefined;
    if (!winner) continue;

    const balanceResult = await db.execute(sql`
      select coalesce(sum(amount), 0)::int as total
      from currency_transactions
      where app_id = ${appId} and user_id = ${winner.user_id} and currency = ${"gems"}
    `);
    const current = Number((balanceResult.rows[0] as { total: number }).total ?? 0);

    await db.execute(sql`
      insert into currency_transactions (
        id, app_id, user_id, currency, amount, balance_after, source, reason
      ) values (
        ${randomUUID()}, ${appId}, ${winner.user_id}, ${"gems"}, ${100}, ${current + 100}, ${TransactionSource.SEASON}, ${`season-win:${seasonId}`}
      )
    `);

    await db.execute(sql`
      insert into audit_logs (
        id, app_id, user_id, actor_type, action, resource_type, resource_id, after
      ) values (
        ${randomUUID()}, ${appId}, ${winner.user_id}, ${"system"}, ${"season.reward"}, ${"season"}, ${seasonId},
        ${JSON.stringify({ leagueId: league.id, amount: 100 })}
      )
    `);
  }
};

export const runSeasonReset = async (appId: string, seasonId: string): Promise<void> => {
  const seasonResult = await db.execute(sql`select reset_xp_on_start from seasons where id = ${seasonId} limit 1`);
  const season = seasonResult.rows[0] as { reset_xp_on_start: boolean } | undefined;

  if (!season || !season.reset_xp_on_start) {
    return;
  }

  await db.execute(sql`
    insert into audit_logs (id, app_id, actor_type, action, resource_type, resource_id, after)
    values (${randomUUID()}, ${appId}, ${"system"}, ${"season.xp_reset"}, ${"season"}, ${seasonId}, ${JSON.stringify({ reset: true })})
  `);
};

import { sql } from "drizzle-orm";
import { db } from "../../infra/db/client";

interface LevelProgress {
  track: string;
  totalXp: number;
  level: number;
  nextLevelXp: number;
}

export const computeLevelProgress = async (appId: string, userId: string): Promise<LevelProgress[]> => {
  const [totalsResult, appResult] = await Promise.all([
    db.execute(sql`
      select track, coalesce(sum(amount), 0)::int as total
      from xp_transactions
      where app_id = ${appId} and user_id = ${userId}
      group by track
    `),
    db.execute(sql`select settings from apps where id = ${appId} limit 1`)
  ]);

  const settings = ((appResult.rows[0] as { settings: Record<string, unknown> } | undefined)?.settings ?? {}) as Record<
    string,
    unknown
  >;
  const xpCurve = (settings.xpCurve as Record<string, number> | undefined) ?? {};

  return totalsResult.rows.map((total) => {
    const track = String((total as { track: string }).track);
    const totalXp = Number((total as { total: number }).total ?? 0);
    const growthFactor = xpCurve[track] ?? 100;
    const level = Math.max(1, Math.floor(Math.sqrt(totalXp / growthFactor)) + 1);
    const nextLevelXp = Math.pow(level, 2) * growthFactor;

    return {
      track,
      totalXp,
      level,
      nextLevelXp
    };
  });
};

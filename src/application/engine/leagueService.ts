import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../../infra/db/client";
import { getPeriodKey } from "../../shared/time";

export interface LeagueTierConfig {
  tier: string;
  maxMembers: number;
  promotionSlots: number;
  demotionSlots: number;
}

export const assignUserToLeague = async (
  appId: string,
  seasonId: string,
  userId: string,
  tierConfig: LeagueTierConfig,
  groupingKey?: string
): Promise<string> => {
  const leagueId = randomUUID();
  await db.execute(sql`
    insert into leagues (id, app_id, season_id, name, tier, grouping_key, max_members, promotion_slots, demotion_slots)
    values (
      ${leagueId}, ${appId}, ${seasonId}, ${`${tierConfig.tier}-${getPeriodKey(new Date())}`}, ${tierConfig.tier}, ${groupingKey ?? null},
      ${tierConfig.maxMembers}, ${tierConfig.promotionSlots}, ${tierConfig.demotionSlots}
    )
  `);

  await db.execute(sql`
    insert into user_leagues (id, app_id, league_id, user_id)
    values (${randomUUID()}, ${appId}, ${leagueId}, ${userId})
    on conflict (league_id, user_id) do nothing
  `);

  return leagueId;
};

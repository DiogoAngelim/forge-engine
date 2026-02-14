import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { AchievementKind } from "../../domain/enums";
import type { JsonObject } from "../../domain/types";
import { db } from "../../infra/db/client";

const resolveProgress = (kind: AchievementKind, condition: JsonObject, context: JsonObject): number => {
  if (kind === "MILESTONE") {
    const target = Number(condition.target ?? 1);
    const current = Number(context.total ?? 0);
    return Math.min(1, current / Math.max(1, target));
  }
  const field = String(condition.field ?? "");
  const expected = condition.equals;
  const current = context[field];
  return current === expected ? 1 : 0;
};

export const checkAchievements = async (appId: string, userId: string, context: JsonObject): Promise<string[]> => {
  const achievementsResult = await db.execute(sql`select * from achievements where app_id = ${appId}`);
  const achievements = achievementsResult.rows as Array<{
    id: string;
    code: string;
    kind: AchievementKind;
    repeatable: boolean;
    conditions: JsonObject;
  }>;

  const unlocked: string[] = [];

  for (const achievement of achievements) {
    const condition = (achievement.conditions as JsonObject | null) ?? {};
    const progress = resolveProgress(achievement.kind, condition, context);

    const existingResult = await db.execute(sql`
      select * from user_achievements
      where user_id = ${userId} and achievement_id = ${achievement.id}
      limit 1
    `);
    const existing = existingResult.rows[0] as
      | {
        id: string;
        unlocked_at: Date | null;
        claim_count: number;
        last_claimed_at: Date | null;
      }
      | undefined;

    if (!existing) {
      await db.execute(sql`
        insert into user_achievements (
          id, app_id, user_id, achievement_id, progress, unlocked_at, claim_count, last_claimed_at
        ) values (
          ${randomUUID()}, ${appId}, ${userId}, ${achievement.id}, ${progress},
          ${progress >= 1 ? new Date() : null}, ${progress >= 1 ? 1 : 0}, ${progress >= 1 ? new Date() : null}
        )
      `);
      if (progress >= 1) {
        unlocked.push(achievement.code);
      }
      continue;
    }

    if (!achievement.repeatable && existing.unlocked_at) {
      continue;
    }

    const unlockedNow = progress >= 1;
    await db.execute(sql`
      update user_achievements
      set progress = ${progress},
          unlocked_at = ${unlockedNow ? new Date() : existing.unlocked_at},
          claim_count = ${unlockedNow ? existing.claim_count + 1 : existing.claim_count},
          last_claimed_at = ${unlockedNow ? new Date() : existing.last_claimed_at}
      where id = ${existing.id}
    `);

    if (unlockedNow) {
      unlocked.push(achievement.code);
    }
  }

  return unlocked;
};

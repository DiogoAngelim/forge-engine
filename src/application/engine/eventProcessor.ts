import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { eventProcessDuration, eventProcessedCounter, ruleEvalCounter } from "../../config/metrics";
import { EventEnvelope } from "../../domain/types";
import { TransactionSource } from "../../domain/enums";
import { RewardRuleModel } from "../../domain/models";
import { db } from "../../infra/db/client";
import { logger } from "../../config/logger";
import { getPeriodKey } from "../../shared/time";
import { evaluateRules } from "./ruleEngine";
import { updateStreak } from "./streakService";
import { checkAchievements } from "./achievementService";
import { addLeaderboardScore } from "./leaderboardService";

export const processEventEnvelope = async (payload: EventEnvelope): Promise<void> => {
  const timer = eventProcessDuration.startTimer({ app_id: payload.appId, event_type: payload.eventType });

  try {
    const processedResult = await db.execute(sql`
      select * from processed_events
      where app_id = ${payload.appId} and idempotency_key = ${payload.idempotencyKey}
      limit 1
    `);
    const processed = processedResult.rows[0] as { id: string; status: string } | undefined;

    if (!processed || processed.status === "PROCESSED") {
      timer();
      return;
    }

    await db.execute(sql`
      update processed_events
      set status = ${"PROCESSING"}, attempts = attempts + 1, updated_at = now()
      where id = ${processed.id}
    `);

    const userResult = await db.execute(sql`
      select id from users where app_id = ${payload.appId} and external_id = ${payload.userId} limit 1
    `);
    const appUser = userResult.rows[0] as { id: string } | undefined;

    if (!appUser) {
      throw new Error("User not found for app");
    }

    const eventId = randomUUID();
    await db.execute(sql`
      insert into events (id, app_id, user_id, event_type, metadata, occurred_at, idempotency_key, payload_hash)
      values (
        ${eventId}, ${payload.appId}, ${appUser.id}, ${payload.eventType}, ${JSON.stringify(payload.metadata ?? {})},
        ${payload.occurredAt ? new Date(payload.occurredAt) : new Date()}, ${payload.idempotencyKey}, ${payload.payloadHash}
      )
    `);

    const rulesResult = await db.execute(sql`
      select * from reward_rules
      where app_id = ${payload.appId} and event_type = ${payload.eventType} and is_active = true
      order by priority asc
    `);
    const rules = rulesResult.rows.map((row) => {
      const data = row as Record<string, unknown>;
      return {
        id: String(data.id),
        appId: String(data.app_id),
        name: String(data.name),
        description: (data.description as string | null) ?? null,
        eventType: String(data.event_type),
        isActive: Boolean(data.is_active),
        priority: Number(data.priority ?? 100),
        conditions: ((data.conditions as Record<string, unknown>) ?? {}) as RewardRuleModel["conditions"],
        xpAwards: ((data.xp_awards as Record<string, unknown>) ?? {}) as RewardRuleModel["xpAwards"],
        currencyAwards: ((data.currency_awards as Record<string, unknown>) ?? {}) as RewardRuleModel["currencyAwards"],
        multiplierConfig: (data.multiplier_config as RewardRuleModel["multiplierConfig"]) ?? null,
        timeBonusConfig: (data.time_bonus_config as RewardRuleModel["timeBonusConfig"]) ?? null,
        streakBonusConfig: (data.streak_bonus_config as RewardRuleModel["streakBonusConfig"]) ?? null
      };
    });

    const streakCount = await updateStreak(payload.appId, appUser.id, "DAILY", 3600);
    const grants = evaluateRules(rules, payload.metadata ?? {}, streakCount);

    for (const [track, amount] of Object.entries(grants.trackAwards)) {
      if (amount === 0) continue;

      await db.execute(sql`
        insert into xp_transactions (
          id, app_id, user_id, event_id, track, amount, source, reason, metadata
        ) values (
          ${randomUUID()}, ${payload.appId}, ${appUser.id}, ${eventId}, ${track}, ${amount}, ${TransactionSource.RULE},
          ${`rule-award:${payload.eventType}`}, ${JSON.stringify({ ruleIds: grants.matchedRuleIds })}
        )
      `);

      await addLeaderboardScore(payload.appId, appUser.id, track, amount, getPeriodKey(new Date()), "APP");
    }

    for (const [currency, amount] of Object.entries(grants.currencyAwards)) {
      if (amount === 0) continue;

      const currentBalanceRow = await db.execute(sql`
        select coalesce(sum(amount), 0)::int as total
        from currency_transactions
        where app_id = ${payload.appId} and user_id = ${appUser.id} and currency = ${currency}
      `);

      const currentBalance = Number((currentBalanceRow.rows[0] as { total: number }).total ?? 0);
      const balanceAfter = currentBalance + amount;

      await db.execute(sql`
        insert into currency_transactions (
          id, app_id, user_id, event_id, currency, amount, balance_after, source, reason, metadata
        ) values (
          ${randomUUID()}, ${payload.appId}, ${appUser.id}, ${eventId}, ${currency}, ${amount}, ${balanceAfter}, ${TransactionSource.RULE},
          ${`rule-award:${payload.eventType}`}, ${JSON.stringify({ ruleIds: grants.matchedRuleIds })}
        )
      `);
    }

    const unlocked = await checkAchievements(payload.appId, appUser.id, {
      eventType: payload.eventType,
      total: Object.values(grants.trackAwards).reduce((acc, value) => acc + value, 0),
      ...(payload.metadata ?? {})
    });

    for (const ruleId of grants.matchedRuleIds) {
      ruleEvalCounter.inc({ app_id: payload.appId, matched: "true" });
      await db.execute(sql`
        insert into rule_evaluation_logs (
          id, app_id, event_id, rule_id, matched, xp_awarded, currency_awarded, metadata
        ) values (
          ${randomUUID()}, ${payload.appId}, ${eventId}, ${ruleId}, true,
          ${Object.values(grants.trackAwards).reduce((acc, value) => acc + value, 0)},
          ${JSON.stringify(grants.currencyAwards)}, ${JSON.stringify({ unlockedAchievements: unlocked })}
        )
      `);
    }

    await db.execute(sql`
      update processed_events
      set status = ${"PROCESSED"}, event_id = ${eventId}, last_error = null, updated_at = now()
      where id = ${processed.id}
    `);

    eventProcessedCounter.inc({ app_id: payload.appId, status: "processed" });
    timer();
  } catch (error) {
    logger.error({ err: error, payload }, "Failed event processing");
    await db.execute(sql`
      update processed_events
      set status = ${"FAILED"}, last_error = ${error instanceof Error ? error.message : "unknown"}, updated_at = now()
      where app_id = ${payload.appId} and idempotency_key = ${payload.idempotencyKey}
    `);
    eventProcessedCounter.inc({ app_id: payload.appId, status: "failed" });
    timer();
    throw error;
  }
};

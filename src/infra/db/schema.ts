import { boolean, index, integer, jsonb, pgTable, real, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const apps = pgTable(
  "apps",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    defaultTimezone: text("default_timezone").notNull().default("UTC"),
    settings: jsonb("settings").notNull(),
    webhookUrl: text("webhook_url"),
    webhookSecret: text("webhook_secret"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("apps_is_active_idx").on(table.isActive)]
);

export const appApiKeys = pgTable(
  "app_api_keys",
  {
    id: text("id").primaryKey(),
    appId: text("app_id").notNull(),
    name: text("name").notNull(),
    hashedKey: text("hashed_key").notNull(),
    role: text("role").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
  },
  (table) => [uniqueIndex("app_api_keys_hashed_key_uidx").on(table.hashedKey), index("app_api_keys_app_role_active_idx").on(table.appId, table.role, table.isActive)]
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    externalId: text("external_id").notNull(),
    appId: text("app_id").notNull(),
    attributes: jsonb("attributes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex("users_app_external_uidx").on(table.appId, table.externalId), index("users_app_created_idx").on(table.appId, table.createdAt)]
);

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    appId: text("app_id").notNull(),
    userId: text("user_id").notNull(),
    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    idempotencyKey: text("idempotency_key").notNull(),
    payloadHash: text("payload_hash").notNull()
  },
  (table) => [uniqueIndex("events_app_idempotency_uidx").on(table.appId, table.idempotencyKey), index("events_app_type_occurred_idx").on(table.appId, table.eventType, table.occurredAt), index("events_user_occurred_idx").on(table.userId, table.occurredAt)]
);

export const rewardRules = pgTable(
  "reward_rules",
  {
    id: text("id").primaryKey(),
    appId: text("app_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    eventType: text("event_type").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    priority: integer("priority").notNull().default(100),
    conditions: jsonb("conditions").notNull(),
    xpAwards: jsonb("xp_awards").notNull(),
    currencyAwards: jsonb("currency_awards").notNull(),
    multiplierConfig: jsonb("multiplier_config"),
    timeBonusConfig: jsonb("time_bonus_config"),
    streakBonusConfig: jsonb("streak_bonus_config"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("reward_rules_lookup_idx").on(table.appId, table.eventType, table.isActive, table.priority)]
);

export const xpTransactions = pgTable("xp_transactions", {
  id: text("id").primaryKey(),
  appId: text("app_id").notNull(),
  userId: text("user_id").notNull(),
  eventId: text("event_id"),
  track: text("track").notNull(),
  amount: integer("amount").notNull(),
  source: text("source").notNull(),
  reason: text("reason").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const currencyTransactions = pgTable("currency_transactions", {
  id: text("id").primaryKey(),
  appId: text("app_id").notNull(),
  userId: text("user_id").notNull(),
  eventId: text("event_id"),
  currency: text("currency").notNull(),
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  source: text("source").notNull(),
  reason: text("reason").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const streaks = pgTable("streaks", {
  id: text("id").primaryKey(),
  appId: text("app_id").notNull(),
  userId: text("user_id").notNull(),
  mode: text("mode").notNull(),
  currentCount: integer("current_count").notNull().default(0),
  bestCount: integer("best_count").notNull().default(0),
  lastQualifiedAt: timestamp("last_qualified_at", { withTimezone: true }),
  graceSeconds: integer("grace_seconds").notNull().default(0),
  freezeCount: integer("freeze_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const achievements = pgTable("achievements", {
  id: text("id").primaryKey(),
  appId: text("app_id").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  kind: text("kind").notNull(),
  tier: text("tier"),
  hidden: boolean("hidden").notNull().default(false),
  repeatable: boolean("repeatable").notNull().default(false),
  conditions: jsonb("conditions").notNull(),
  rewardConfig: jsonb("reward_config"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const userAchievements = pgTable("user_achievements", {
  id: text("id").primaryKey(),
  appId: text("app_id").notNull(),
  userId: text("user_id").notNull(),
  achievementId: text("achievement_id").notNull(),
  progress: real("progress").notNull().default(0),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
  claimCount: integer("claim_count").notNull().default(0),
  lastClaimedAt: timestamp("last_claimed_at", { withTimezone: true })
});

export const seasons = pgTable("seasons", {
  id: text("id").primaryKey(),
  appId: text("app_id").notNull(),
  name: text("name").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").notNull().default(false),
  resetXpOnStart: boolean("reset_xp_on_start").notNull().default(false),
  rewardConfig: jsonb("reward_config"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const leagues = pgTable("leagues", {
  id: text("id").primaryKey(),
  appId: text("app_id").notNull(),
  seasonId: text("season_id"),
  name: text("name").notNull(),
  tier: text("tier").notNull(),
  groupingKey: text("grouping_key"),
  maxMembers: integer("max_members").notNull().default(50),
  promotionSlots: integer("promotion_slots").notNull().default(5),
  demotionSlots: integer("demotion_slots").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const userLeagues = pgTable("user_leagues", {
  id: text("id").primaryKey(),
  leagueId: text("league_id").notNull(),
  userId: text("user_id").notNull(),
  appId: text("app_id").notNull(),
  rank: integer("rank"),
  points: integer("points").notNull().default(0),
  result: text("result"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow()
});

export const leaderboardEntries = pgTable("leaderboard_entries", {
  id: text("id").primaryKey(),
  appId: text("app_id").notNull(),
  userId: text("user_id").notNull(),
  scope: text("scope").notNull(),
  leagueId: text("league_id"),
  metric: text("metric").notNull(),
  score: real("score").notNull(),
  periodKey: text("period_key").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const processedEvents = pgTable("processed_events", {
  id: text("id").primaryKey(),
  appId: text("app_id").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  status: text("status").notNull().default("RECEIVED"),
  eventId: text("event_id"),
  lastError: text("last_error"),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const ruleEvaluationLogs = pgTable("rule_evaluation_logs", {
  id: text("id").primaryKey(),
  appId: text("app_id").notNull(),
  eventId: text("event_id").notNull(),
  ruleId: text("rule_id").notNull(),
  matched: boolean("matched").notNull(),
  xpAwarded: integer("xp_awarded").notNull().default(0),
  currencyAwarded: jsonb("currency_awarded"),
  reason: text("reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  appId: text("app_id").notNull(),
  userId: text("user_id"),
  actorType: text("actor_type").notNull(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  traceId: text("trace_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

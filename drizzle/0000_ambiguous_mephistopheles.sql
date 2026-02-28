CREATE TABLE "achievements" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"kind" text NOT NULL,
	"tier" text,
	"hidden" boolean DEFAULT false NOT NULL,
	"repeatable" boolean DEFAULT false NOT NULL,
	"conditions" jsonb NOT NULL,
	"reward_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"name" text NOT NULL,
	"hashed_key" text NOT NULL,
	"role" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "apps" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"default_timezone" text DEFAULT 'UTC' NOT NULL,
	"settings" jsonb NOT NULL,
	"webhook_url" text,
	"webhook_secret" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"user_id" text,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"before" jsonb,
	"after" jsonb,
	"trace_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currency_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"user_id" text NOT NULL,
	"event_id" text,
	"currency" text NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"source" text NOT NULL,
	"reason" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"user_id" text NOT NULL,
	"event_type" text NOT NULL,
	"metadata" jsonb,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"user_id" text NOT NULL,
	"scope" text NOT NULL,
	"league_id" text,
	"metric" text NOT NULL,
	"score" real NOT NULL,
	"period_key" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"season_id" text,
	"name" text NOT NULL,
	"tier" text NOT NULL,
	"grouping_key" text,
	"max_members" integer DEFAULT 50 NOT NULL,
	"promotion_slots" integer DEFAULT 5 NOT NULL,
	"demotion_slots" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processed_events" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'RECEIVED' NOT NULL,
	"event_id" text,
	"last_error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"event_type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"conditions" jsonb NOT NULL,
	"xp_awards" jsonb NOT NULL,
	"currency_awards" jsonb NOT NULL,
	"multiplier_config" jsonb,
	"time_bonus_config" jsonb,
	"streak_bonus_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rule_evaluation_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"event_id" text NOT NULL,
	"rule_id" text NOT NULL,
	"matched" boolean NOT NULL,
	"xp_awarded" integer DEFAULT 0 NOT NULL,
	"currency_awarded" jsonb,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"reset_xp_on_start" boolean DEFAULT false NOT NULL,
	"reward_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaks" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"user_id" text NOT NULL,
	"mode" text NOT NULL,
	"current_count" integer DEFAULT 0 NOT NULL,
	"best_count" integer DEFAULT 0 NOT NULL,
	"last_qualified_at" timestamp with time zone,
	"grace_seconds" integer DEFAULT 0 NOT NULL,
	"freeze_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"user_id" text NOT NULL,
	"achievement_id" text NOT NULL,
	"progress" real DEFAULT 0 NOT NULL,
	"unlocked_at" timestamp with time zone,
	"claim_count" integer DEFAULT 0 NOT NULL,
	"last_claimed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_leagues" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"user_id" text NOT NULL,
	"app_id" text NOT NULL,
	"rank" integer,
	"points" integer DEFAULT 0 NOT NULL,
	"result" text,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"app_id" text NOT NULL,
	"attributes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xp_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"user_id" text NOT NULL,
	"event_id" text,
	"track" text NOT NULL,
	"amount" integer NOT NULL,
	"source" text NOT NULL,
	"reason" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_api_keys_hashed_key_uidx" ON "app_api_keys" USING btree ("hashed_key");--> statement-breakpoint
CREATE INDEX "app_api_keys_app_role_active_idx" ON "app_api_keys" USING btree ("app_id","role","is_active");--> statement-breakpoint
CREATE INDEX "apps_is_active_idx" ON "apps" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "events_app_idempotency_uidx" ON "events" USING btree ("app_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "events_app_type_occurred_idx" ON "events" USING btree ("app_id","event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "events_user_occurred_idx" ON "events" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "reward_rules_lookup_idx" ON "reward_rules" USING btree ("app_id","event_type","is_active","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "users_app_external_uidx" ON "users" USING btree ("app_id","external_id");--> statement-breakpoint
CREATE INDEX "users_app_created_idx" ON "users" USING btree ("app_id","created_at");
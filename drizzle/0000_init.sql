CREATE TABLE IF NOT EXISTS apps (
  id text PRIMARY KEY,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  default_timezone text NOT NULL DEFAULT 'UTC',
  settings jsonb NOT NULL,
  webhook_url text,
  webhook_secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_api_keys (
  id text PRIMARY KEY,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  name text NOT NULL,
  hashed_key text NOT NULL UNIQUE,
  role text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  external_id text NOT NULL,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  attributes jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_id, external_id)
);

CREATE TABLE IF NOT EXISTS events (
  id text PRIMARY KEY,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  idempotency_key text NOT NULL,
  payload_hash text NOT NULL,
  UNIQUE (app_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS reward_rules (
  id text PRIMARY KEY,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  event_type text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  conditions jsonb NOT NULL,
  xp_awards jsonb NOT NULL,
  currency_awards jsonb NOT NULL,
  multiplier_config jsonb,
  time_bonus_config jsonb,
  streak_bonus_config jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS xp_transactions (
  id text PRIMARY KEY,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id text,
  track text NOT NULL,
  amount integer NOT NULL,
  source text NOT NULL,
  reason text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS currency_transactions (
  id text PRIMARY KEY,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id text,
  currency text NOT NULL,
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  source text NOT NULL,
  reason text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS streaks (
  id text PRIMARY KEY,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode text NOT NULL,
  current_count integer NOT NULL DEFAULT 0,
  best_count integer NOT NULL DEFAULT 0,
  last_qualified_at timestamptz,
  grace_seconds integer NOT NULL DEFAULT 0,
  freeze_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_id, user_id, mode)
);

CREATE TABLE IF NOT EXISTS achievements (
  id text PRIMARY KEY,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  kind text NOT NULL,
  tier text,
  hidden boolean NOT NULL DEFAULT false,
  repeatable boolean NOT NULL DEFAULT false,
  conditions jsonb NOT NULL,
  reward_config jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_id, code)
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id text PRIMARY KEY,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  progress real NOT NULL DEFAULT 0,
  unlocked_at timestamptz,
  claim_count integer NOT NULL DEFAULT 0,
  last_claimed_at timestamptz,
  UNIQUE (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS seasons (
  id text PRIMARY KEY,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  name text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  reset_xp_on_start boolean NOT NULL DEFAULT false,
  reward_config jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leagues (
  id text PRIMARY KEY,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  season_id text REFERENCES seasons(id) ON DELETE SET NULL,
  name text NOT NULL,
  tier text NOT NULL,
  grouping_key text,
  max_members integer NOT NULL DEFAULT 50,
  promotion_slots integer NOT NULL DEFAULT 5,
  demotion_slots integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_leagues (
  id text PRIMARY KEY,
  league_id text NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  rank integer,
  points integer NOT NULL DEFAULT 0,
  result text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (league_id, user_id)
);

CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id text PRIMARY KEY,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope text NOT NULL,
  league_id text,
  metric text NOT NULL,
  score real NOT NULL,
  period_key text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS processed_events (
  id text PRIMARY KEY,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'RECEIVED',
  event_id text,
  last_error text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS rule_evaluation_logs (
  id text PRIMARY KEY,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  rule_id text NOT NULL,
  matched boolean NOT NULL,
  xp_awarded integer NOT NULL DEFAULT 0,
  currency_awarded jsonb,
  reason text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id text PRIMARY KEY,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  user_id text,
  actor_type text NOT NULL,
  actor_id text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  before jsonb,
  after jsonb,
  trace_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reward_rules_lookup_idx ON reward_rules (app_id, event_type, is_active, priority);
CREATE INDEX IF NOT EXISTS events_app_type_occurred_idx ON events (app_id, event_type, occurred_at);
CREATE INDEX IF NOT EXISTS currency_transactions_user_currency_idx ON currency_transactions (app_id, user_id, currency, created_at);
CREATE INDEX IF NOT EXISTS xp_transactions_user_track_idx ON xp_transactions (app_id, user_id, track, created_at);
CREATE INDEX IF NOT EXISTS leaderboard_entries_lookup_idx ON leaderboard_entries (app_id, scope, metric, period_key, score);

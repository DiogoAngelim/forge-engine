# ForgeEngine

ForgeEngine is a multi-tenant gamification API for product teams that want to add XP, coins, streaks, achievements, seasons, and leaderboards without hardcoding reward logic inside their main application.

It is built with Node.js + TypeScript, PostgreSQL, Redis, Drizzle ORM, and BullMQ.

## What you get

- Event-driven rewards (`POST /events`)
- Rule engine with conditional XP and currency awards
- Streak tracking
- Achievement unlocks
- App/global/league leaderboards
- Currency spend flow with balance checks and audit logs
- Tenant isolation by API key context
- Signature validation + replay protection for event ingestion
- Worker-based async processing
- Prometheus metrics and structured logs

---

## 1) Quick Start (10 minutes)

### Prerequisites

- Node.js 20+
- PostgreSQL running locally
- Redis running locally

### Install

```bash
npm install
cp .env.example .env
```

### Configure environment

Default values in `.env` should already work for local development:

```dotenv
PORT=3000
DATABASE_URL=postgresql://forge:forge@localhost:5432/forge_engine
REDIS_URL=redis://localhost:6379
```

### Apply schema

Use one of the options below:

```bash
npm run db:generate
npm run db:migrate
```

or execute SQL directly:

```bash
psql "postgresql://forge:forge@localhost:5432/forge_engine" -f drizzle/0000_init.sql
```

### Run API + Worker

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npm run worker:dev
```

### Health check

```bash
curl -i http://localhost:3000/health
```

Expected: `200 OK`

---

## 2) First working flow (copy/paste)

### 2.1 Create app

```bash
curl -s http://localhost:3000/apps \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "finance-demo-app",
    "name": "Finance Demo",
    "webhookSecret": "supersecret123"
  }'
```

Response includes:

- `app`
- `bootstrapApiKey` (save this securely)

### 2.2 Create user

```bash
curl -s http://localhost:3000/users \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: <BOOTSTRAP_API_KEY>' \
  -d '{
    "userId": "user-1",
    "attributes": {"plan": "pro"}
  }'
```

### 2.3 Create reward rule (admin)

```bash
curl -s http://localhost:3000/rules \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: <BOOTSTRAP_API_KEY>' \
  -d '{
    "name": "Hard Task Reward",
    "eventType": "task_completed",
    "conditions": {"all": [{"field": "difficulty", "op": "eq", "value": "hard"}]},
    "xpAwards": {"Builder XP": 40},
    "currencyAwards": {"coins": 15},
    "isActive": true
  }'
```

### 2.4 Submit signed event

Headers required for `/events`:

- `x-api-key`
- `x-signature-timestamp`
- `x-signature-nonce`
- `x-signature`

Signature algorithm:

- payload string: `<timestamp>.<nonce>.<raw_json_body>`
- signature: `hex(HMAC_SHA256(webhookSecret, payload_string))`

### 2.5 Read profile

```bash
curl -s http://localhost:3000/users/user-1/profile \
  -H 'x-api-key: <BOOTSTRAP_API_KEY>'
```

You should see XP/currency updates after worker processing.

---

## 3) API Reference

## Public routes

### `POST /apps`

Creates a tenant app and a bootstrap `ADMIN` API key.

Request body:

```json
{
  "id": "string (min 2)",
  "name": "string (min 2)",
  "settings": {},
  "defaultTimezone": "UTC",
  "webhookUrl": "https://... (optional)",
  "webhookSecret": "string min 8 (optional)"
}
```

Response: `201`

```json
{
  "app": {"...": "..."},
  "bootstrapApiKey": "fge_..."
}
```

### `GET /health`

Response: `200`

```json
{"status":"ok"}
```

### `GET /metrics`

Prometheus metrics output.

## Authenticated routes (`x-api-key` required)

### `POST /users`

Upserts user by `userId` within current app.

### `GET /users/:id/profile`

Returns:

- user
- levels
- streaks
- currency balances
- visible achievements

### `POST /events`

Requires event signature headers (see security section).

Request body:

```json
{
  "appId": "current app id",
  "userId": "string",
  "eventType": "string",
  "metadata": {},
  "occurredAt": "ISO datetime (optional)",
  "idempotencyKey": "string min 8 (optional)"
}
```

Response: `202`

```json
{
  "status": "accepted",
  "idempotencyKey": "..."
}
```

### `GET /leaderboards`

Query params:

- `metric` (default: `Builder XP`)
- `scope` (`GLOBAL | APP | LEAGUE`, default `APP`)
- `periodKey` (optional; defaults to current period)
- `leagueId` (optional)
- `limit` (default `50`, max `200`)

### `POST /currency/spend`

Request body:

```json
{
  "userId": "string",
  "currency": "coins",
  "amount": 10,
  "reason": "unlock_feature",
  "metadata": {}
}
```

Response: `201` with created transaction.

If insufficient balance, response is `409`.

## Admin-only routes (`ADMIN` key required)

### `POST /rules`

Creates reward rule.

### `POST /achievements`

Creates achievement definition.

### `POST /seasons`

Creates season configuration.

---

## 4) Security model

- API key auth via `x-api-key`
- Key roles: `ADMIN`, `INGEST`, `READONLY`
- `/events` requires HMAC signature headers
- Signature timestamp tolerance controlled by `SIGNATURE_TOLERANCE_SECONDS`
- Replay protection via Redis nonce key
- Tenant isolation by app-scoped lookups and writes
- Rate limiting per app/key pair

Common event auth errors:

- `401 Missing event signature headers`
- `401 Invalid signature`
- `401 Expired signature timestamp`
- `401 Replay detected`

---

## 5) Event processing lifecycle

1. Client sends event to `POST /events`
2. API validates auth/signature/idempotency
3. API stores `processed_events` row (`RECEIVED`)
4. API enqueues BullMQ job
5. Worker processes rules/awards/streaks/achievements/leaderboard
6. DB and Redis are updated; status becomes processed (or failed)

---

## 6) Architecture overview

```text
src/
  application/engine/      # Rule engine and domain services
  config/                  # Env, logger, metrics
  domain/                  # Enums and shared domain types
  infra/
    cache/                 # Redis client
    db/                    # Drizzle client + schema
    http/                  # Express routes + middleware
    queue/                 # BullMQ queue setup
  modules/                 # Route modules by feature
  shared/                  # Errors, hash/time helpers
  workers/                 # Background event worker
```

Core storage:

- PostgreSQL: transactional source of truth
- Redis: cache, leaderboards, rate limiting, replay keys

---

## 7) Developer scripts

```bash
npm run dev            # API in watch mode
npm run worker:dev     # Worker in watch mode
npm run build          # TypeScript build
npm run start          # Run built API
npm run worker         # Run built worker
npm run lint           # ESLint
npm run test           # Vitest
npm run test:coverage  # Vitest + coverage
npm run db:generate    # Drizzle generate
npm run db:migrate     # Drizzle migrate
```

---

## 8) Testing and quality

Current project quality checks include:

- Unit/integration tests with Vitest + supertest
- Coverage target met (`>=98%`, currently above threshold)
- ESLint clean
- TypeScript build clean

Recommended local validation before merging:

```bash
npm run lint
npm run build
npm run test:coverage
```

---

## 9) Operations and production notes

- Run API and worker as separate processes
- Use managed PostgreSQL + Redis in production
- Keep API keys and webhook secrets in a secret manager
- Use connection pooling and monitor queue depth
- Scrape `/metrics` from Prometheus
- Alert on worker failures and queue backlog growth

---

## 10) Troubleshooting

### API crashes on async route error

Ensure `express-async-errors` is installed and imported in app bootstrap.

### Event rejected with invalid signature

Ensure the signed payload uses the exact raw JSON bytes sent in request body.

### `409 Insufficient balance` on `/currency/spend`

User does not have enough currency balance for requested amount.

### Event accepted but profile not updated yet

Worker may be stopped or delayed. Verify worker process and queue health.

### Port already in use (`EADDRINUSE: 3000`)

Stop old process or run with a different `PORT`.

---

## 11) Useful files

- `drizzle/0000_init.sql` — SQL schema bootstrap
- `src/infra/db/schema.ts` — Drizzle schema model
- `src/modules/*` — endpoint contracts and handlers
- `src/workers/eventWorker.ts` — async event processor
- `tests/*` — test coverage reference

---

## License

Internal/project-specific. Add your organization license policy as needed.
# forge-engine

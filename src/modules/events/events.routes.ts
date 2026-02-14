import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../../infra/db/client";
import { eventQueue, EVENT_JOB_NAME } from "../../infra/queue/eventQueue";
import { sha256 } from "../../shared/hash";
import { ConflictError } from "../../shared/errors";

const eventSchema = z.object({
  appId: z.string().min(1),
  userId: z.string().min(1),
  eventType: z.string().min(1),
  metadata: z.record(z.any()).optional(),
  occurredAt: z.string().datetime().optional(),
  idempotencyKey: z.string().min(8).optional()
});

export const eventsRouter = Router();

eventsRouter.post("/events", async (req, res) => {
  const payload = eventSchema.parse(req.body);
  const ctx = req.appContext!;

  if (payload.appId !== ctx.appId) {
    throw new ConflictError("Payload appId mismatch");
  }

  const idempotencyKey =
    payload.idempotencyKey ??
    sha256(`${payload.appId}:${payload.userId}:${payload.eventType}:${JSON.stringify(payload.metadata ?? {})}`);

  const bodyHash = sha256(req.rawBody?.toString("utf8") ?? JSON.stringify(req.body));

  await db.execute(sql`
    insert into processed_events (id, app_id, idempotency_key, status)
    values (${randomUUID()}, ${payload.appId}, ${idempotencyKey}, ${"RECEIVED"})
    on conflict (app_id, idempotency_key) do nothing
  `);

  await eventQueue.add(
    EVENT_JOB_NAME,
    {
      appId: payload.appId,
      userId: payload.userId,
      eventType: payload.eventType,
      metadata: payload.metadata,
      occurredAt: payload.occurredAt,
      idempotencyKey,
      payloadHash: bodyHash
    },
    {
      jobId: `${payload.appId}-${idempotencyKey}`
    }
  );

  res.status(202).json({
    status: "accepted",
    idempotencyKey
  });
});

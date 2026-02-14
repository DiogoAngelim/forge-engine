import { Router } from "express";
import { randomBytes, randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../infra/db/client";
import { sha256 } from "../../shared/hash";

const createAppSchema = z.object({
  id: z.string().min(2),
  name: z.string().min(2),
  settings: z.record(z.any()).default({}),
  defaultTimezone: z.string().default("UTC"),
  webhookUrl: z.string().url().optional(),
  webhookSecret: z.string().min(8).optional()
});

export const appsRouter = Router();

appsRouter.post("/apps", async (req, res) => {
  const payload = createAppSchema.parse(req.body);

  const apiKeyRaw = `fge_${randomBytes(24).toString("hex")}`;
  const hashedKey = sha256(apiKeyRaw);

  await db.transaction(async (tx) => {
    await tx.execute(sql`
      insert into apps (id, name, settings, default_timezone, webhook_url, webhook_secret)
      values (${payload.id}, ${payload.name}, ${JSON.stringify(payload.settings)}, ${payload.defaultTimezone}, ${payload.webhookUrl ?? null}, ${payload.webhookSecret ?? null})
    `);

    await tx.execute(sql`
      insert into app_api_keys (id, app_id, name, hashed_key, role, is_active)
      values (${randomUUID()}, ${payload.id}, ${"bootstrap-admin"}, ${hashedKey}, ${"ADMIN"}, true)
    `);
  });

  const appResult = await db.execute(sql`select * from apps where id = ${payload.id} limit 1`);
  const app = appResult.rows[0];

  res.status(201).json({
    app,
    bootstrapApiKey: apiKeyRaw
  });
});

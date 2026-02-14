import { NextFunction, Request, Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "../../db/client";
import { redis } from "../../cache/redis";
import { UnauthorizedError } from "../../../shared/errors";
import { sha256 } from "../../../shared/hash";

const API_KEY_CACHE_SECONDS = 120;

export const appAuthMiddleware = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const apiKey = req.header("x-api-key");
  if (!apiKey) {
    throw new UnauthorizedError("Missing API key");
  }

  const hashed = sha256(apiKey);
  const cacheKey = `forge:apikey:${hashed}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    const parsed = JSON.parse(cached) as { appId: string; role: "ADMIN" | "INGEST" | "READONLY"; keyId: string };
    req.appContext = {
      appId: parsed.appId,
      apiKeyRole: parsed.role,
      keyId: parsed.keyId
    };
    return next();
  }

  const result = await db.execute(sql`
    select k.id, k.role, k.app_id
    from app_api_keys k
    join apps a on a.id = k.app_id
    where k.hashed_key = ${hashed}
      and k.is_active = true
      and a.is_active = true
    limit 1
  `);

  const key = result.rows[0] as { id: string; role: "ADMIN" | "INGEST" | "READONLY"; app_id: string } | undefined;

  if (!key) {
    throw new UnauthorizedError("Invalid API key");
  }

  await db.execute(sql`update app_api_keys set last_used_at = now() where id = ${key.id}`);

  await redis.setex(cacheKey, API_KEY_CACHE_SECONDS, JSON.stringify({ appId: key.app_id, role: key.role, keyId: key.id }));

  req.appContext = {
    appId: key.app_id,
    apiKeyRole: key.role,
    keyId: key.id
  };

  next();
};

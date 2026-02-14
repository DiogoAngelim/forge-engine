import { createHmac, timingSafeEqual } from "crypto";
import { NextFunction, Request, Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "../../db/client";
import { redis } from "../../cache/redis";
import { env } from "../../../config/env";
import { UnauthorizedError } from "../../../shared/errors";

export const eventSignatureMiddleware = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  if (!req.appContext || req.path !== "/events") {
    return next();
  }

  const timestamp = req.header("x-signature-timestamp");
  const nonce = req.header("x-signature-nonce");
  const signature = req.header("x-signature");

  if (!timestamp || !nonce || !signature) {
    throw new UnauthorizedError("Missing event signature headers");
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    throw new UnauthorizedError("Invalid signature timestamp");
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (ageSeconds > env.SIGNATURE_TOLERANCE_SECONDS) {
    throw new UnauthorizedError("Expired signature timestamp");
  }

  const replayKey = `forge:replay:${req.appContext.appId}:${nonce}`;
  const replaySet = await redis.set(replayKey, "1", "EX", env.SIGNATURE_TOLERANCE_SECONDS, "NX");
  if (!replaySet) {
    throw new UnauthorizedError("Replay detected");
  }

  const appResult = await db.execute(
    sql`select webhook_secret from apps where id = ${req.appContext.appId} limit 1`
  );
  const app = appResult.rows[0] as { webhook_secret: string | null } | undefined;

  if (!app?.webhook_secret || !req.rawBody) {
    throw new UnauthorizedError("Signature validation unavailable");
  }

  const payload = `${timestamp}.${nonce}.${req.rawBody.toString("utf8")}`;
  const expected = createHmac("sha256", app.webhook_secret).update(payload).digest("hex");

  const incomingBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (incomingBuffer.length !== expectedBuffer.length || !timingSafeEqual(incomingBuffer, expectedBuffer)) {
    throw new UnauthorizedError("Invalid signature");
  }

  next();
};

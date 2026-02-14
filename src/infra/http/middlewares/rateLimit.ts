import { NextFunction, Request, Response } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { env } from "../../../config/env";
import { redis } from "../../cache/redis";
import { ForbiddenError, UnauthorizedError } from "../../../shared/errors";

const limiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "forge:rl",
  points: env.DEFAULT_RATE_LIMIT_POINTS,
  duration: env.DEFAULT_RATE_LIMIT_WINDOW_SECONDS
});

export const appRateLimitMiddleware = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  if (!req.appContext) {
    throw new UnauthorizedError("Missing app context");
  }

  try {
    await limiter.consume(`${req.appContext.appId}:${req.appContext.keyId}`);
    next();
  } catch {
    throw new ForbiddenError("Rate limit exceeded");
  }
};

import { buildApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { connectDb } from "./infra/db/client";
import { redis } from "./infra/cache/redis";

const start = async (): Promise<void> => {
  await connectDb();
  await redis.ping();

  const app = buildApp();

  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "ForgeEngine API listening");
  });
};

start().catch((error) => {
  logger.error({ err: error }, "Failed to start API");
  process.exit(1);
});

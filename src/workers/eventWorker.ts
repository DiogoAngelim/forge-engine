import { createEventWorker } from "../infra/queue/eventQueue";
import { processEventEnvelope } from "../application/engine/eventProcessor";
import { logger } from "../config/logger";
import { connectDb } from "../infra/db/client";
import { redis } from "../infra/cache/redis";

const startWorker = async (): Promise<void> => {
  await connectDb();
  await redis.ping();

  createEventWorker(async (job) => {
    await processEventEnvelope(job.data);
  })
    .on("completed", (job) => {
      logger.info({ jobId: job.id }, "Event job processed");
    })
    .on("failed", (job, error) => {
      logger.error({ jobId: job?.id, err: error }, "Event job failed");
    });

  logger.info("Event worker started");
};

startWorker().catch((error) => {
  logger.error({ err: error }, "Failed to start event worker");
  process.exit(1);
});

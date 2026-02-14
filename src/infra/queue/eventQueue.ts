import { JobsOptions, Processor, Queue, Worker } from "bullmq";
import { env } from "../../config/env";
import type { EventEnvelope } from "../../domain/types";

export const EVENT_JOB_NAME = "process-event";

const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 1000
  },
  removeOnComplete: 5000,
  removeOnFail: 5000
};

export const eventQueue = new Queue<EventEnvelope, void, string>("events", {
  connection: {
    url: env.REDIS_URL
  },
  prefix: env.BULLMQ_PREFIX,
  defaultJobOptions
});

export const createEventWorker = (processor: Processor<EventEnvelope, void, string>) =>
  new Worker<EventEnvelope, void, string>(
    "events",
    processor,
    {
      connection: {
        url: env.REDIS_URL
      },
      prefix: env.BULLMQ_PREFIX,
      concurrency: 30
    }
  );

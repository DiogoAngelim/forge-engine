import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  BULLMQ_PREFIX: z.string().default("forge-engine"),
  LOG_LEVEL: z.string().default("info"),
  METRICS_ENABLED: z
    .string()
    .default("true")
    .transform((value) => value.toLowerCase() === "true"),
  DEFAULT_RATE_LIMIT_POINTS: z.coerce.number().default(120),
  DEFAULT_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().default(60),
  SIGNATURE_TOLERANCE_SECONDS: z.coerce.number().default(300),
  INTERNAL_WEBHOOK_TIMEOUT_MS: z.coerce.number().default(5000)
});

export const env = envSchema.parse(process.env);

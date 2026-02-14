import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: ["req.headers.authorization", "req.headers.x-api-key", "req.headers.x-signature"],
    censor: "[REDACTED]"
  }
});

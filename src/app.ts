import "express-async-errors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { logger } from "./config/logger";
import { apiRouter } from "./infra/http/routes";
import { appAuthMiddleware } from "./infra/http/middlewares/auth";
import { appRateLimitMiddleware } from "./infra/http/middlewares/rateLimit";
import { eventSignatureMiddleware } from "./infra/http/middlewares/signature";
import { errorHandler, notFoundHandler } from "./infra/http/middlewares/errorHandler";
import { metricsRegistry } from "./config/metrics";

type RawBodyRequest = express.Request & { rawBody?: Buffer };

export const buildApp = () => {
  const app = express();

  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buffer) => {
        (req as RawBodyRequest).rawBody = buffer;
      }
    })
  );
  app.use(helmet());
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", metricsRegistry.contentType);
    res.send(await metricsRegistry.metrics());
  });

  app.use((req, _res, next) => {
    if (req.path === "/apps") {
      return next();
    }
    return appAuthMiddleware(req, _res, next);
  });
  app.use((req, _res, next) => {
    if (req.path === "/apps") {
      return next();
    }
    return appRateLimitMiddleware(req, _res, next);
  });
  app.use(eventSignatureMiddleware);

  app.use(apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

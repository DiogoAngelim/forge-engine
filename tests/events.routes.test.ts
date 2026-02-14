import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { execute, add } = vi.hoisted(() => ({
  execute: vi.fn(),
  add: vi.fn()
}));

vi.mock("../src/infra/db/client", () => ({
  db: {
    execute
  }
}));

vi.mock("../src/infra/queue/eventQueue", () => ({
  EVENT_JOB_NAME: "process-event",
  eventQueue: {
    add
  }
}));

import { eventsRouter } from "../src/modules/events/events.routes";

describe("POST /events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    execute.mockResolvedValue({ rows: [] });
    add.mockResolvedValue(undefined);
  });

  const appWithContext = () => {
    const app = express();
    app.use(
      express.json({
        verify: (req, _res, buf) => {
          req.rawBody = buf;
        }
      })
    );
    app.use((req, _res, next) => {
      req.appContext = { appId: "finance-app", apiKeyRole: "INGEST", keyId: "k1" };
      next();
    });
    app.use(eventsRouter);
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(400).json({ error: err.message });
    });
    return app;
  };

  it("accepts event with generated idempotency key", async () => {
    const app = appWithContext();

    const payload = {
      appId: "finance-app",
      userId: "123",
      eventType: "task_completed",
      metadata: { difficulty: "hard" }
    };

    const response = await request(app).post("/events").send(payload);

    expect(response.status).toBe(202);
    expect(response.body.status).toBe("accepted");
    expect(response.body.idempotencyKey).toHaveLength(64);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0][2].jobId).toContain("finance-app-");
  });

  it("accepts event with provided idempotency key", async () => {
    const app = appWithContext();

    const response = await request(app).post("/events").send({
      appId: "finance-app",
      userId: "123",
      eventType: "task_completed",
      idempotencyKey: "event-idem-1234"
    });

    expect(response.status).toBe(202);
    expect(response.body.idempotencyKey).toBe("event-idem-1234");
  });

});

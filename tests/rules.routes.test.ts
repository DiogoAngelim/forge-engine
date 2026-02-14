import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { execute } = vi.hoisted(() => ({
  execute: vi.fn()
}));

vi.mock("../src/infra/db/client", () => ({
  db: {
    execute
  }
}));

import { rulesRouter } from "../src/modules/rules/rules.routes";

describe("POST /rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    execute.mockResolvedValue({ rows: [{ id: "rule-1", name: "Hard Task" }] });
  });

  it("creates a reward rule", async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.appContext = { appId: "app-1", apiKeyRole: "ADMIN", keyId: "k1" };
      next();
    });
    app.use(rulesRouter);

    const response = await request(app).post("/rules").send({
      name: "Hard Task",
      eventType: "task_completed",
      conditions: { all: [{ field: "difficulty", op: "eq", value: "hard" }] },
      xpAwards: { "Builder XP": 10 },
      currencyAwards: { coins: 2 },
      isActive: true
    });

    expect(response.status).toBe(201);
    expect(response.body.rule).toEqual({ id: "rule-1", name: "Hard Task" });
    expect(execute).toHaveBeenCalledTimes(2);
  });
});

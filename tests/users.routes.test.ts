import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { execute, computeLevelProgress } = vi.hoisted(() => ({
  execute: vi.fn(),
  computeLevelProgress: vi.fn()
}));

vi.mock("../src/infra/db/client", () => ({
  db: {
    execute
  }
}));

vi.mock("../src/application/engine/levelingService", () => ({
  computeLevelProgress
}));

import { usersRouter } from "../src/modules/users/users.routes";

describe("users routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const appWithContext = () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.appContext = { appId: "finance-app", apiKeyRole: "ADMIN", keyId: "k1" };
      next();
    });
    app.use(usersRouter);
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(404).json({ error: err.message });
    });
    return app;
  };

  it("upserts user", async () => {
    execute.mockResolvedValueOnce({ rows: [] });
    execute.mockResolvedValueOnce({ rows: [{ id: "u1", external_id: "123" }] });

    const app = appWithContext();
    const response = await request(app).post("/users").send({ userId: "123", attributes: { plan: "pro" } });

    expect(response.status).toBe(201);
    expect(response.body.user).toEqual({ id: "u1", external_id: "123" });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("returns full profile with filtered hidden achievements", async () => {
    computeLevelProgress.mockResolvedValue([{ track: "Builder XP", totalXp: 100, level: 2, nextLevelXp: 400 }]);

    execute.mockResolvedValueOnce({ rows: [{ id: "user-internal-1", external_id: "123" }] });
    execute.mockResolvedValueOnce({ rows: [{ mode: "DAILY", current_count: 3 }] });
    execute.mockResolvedValueOnce({ rows: [{ currency: "coins", balance: 55 }] });
    execute.mockResolvedValueOnce({
      rows: [
        { code: "public_badge", name: "Public", tier: "gold", hidden: false, unlocked_at: "2026-01-01" },
        { code: "hidden_badge", name: "Hidden", tier: "gold", hidden: true, unlocked_at: "2026-01-01" }
      ]
    });

    const app = appWithContext();
    const response = await request(app).get("/users/123/profile");

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({ id: "user-internal-1", external_id: "123" });
    expect(response.body.levels).toHaveLength(1);
    expect(response.body.streaks).toEqual([{ mode: "DAILY", current_count: 3 }]);
    expect(response.body.currencies).toEqual([{ currency: "coins", balance: 55 }]);
    expect(response.body.achievements).toEqual([
      {
        code: "public_badge",
        name: "Public",
        tier: "gold",
        unlockedAt: "2026-01-01"
      }
    ]);
  });
});

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getLeaderboard } = vi.hoisted(() => ({
  getLeaderboard: vi.fn()
}));

vi.mock("../src/application/engine/leaderboardService", () => ({
  getLeaderboard
}));

import { leaderboardsRouter } from "../src/modules/leaderboards/leaderboards.routes";

describe("GET /leaderboards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLeaderboard.mockResolvedValue([{ userId: "u1", score: 100, rank: 1 }]);
  });

  it("returns leaderboard rows with defaults", async () => {
    const app = express();
    app.use((req, _res, next) => {
      req.appContext = { appId: "app-1", apiKeyRole: "READONLY", keyId: "k1" };
      next();
    });
    app.use(leaderboardsRouter);

    const response = await request(app).get("/leaderboards");

    expect(response.status).toBe(200);
    expect(response.body.rows).toEqual([{ userId: "u1", score: 100, rank: 1 }]);
    expect(response.body.metric).toBe("Builder XP");
    expect(response.body.scope).toBe("APP");
    expect(getLeaderboard).toHaveBeenCalledTimes(1);
  });

  it("passes explicit query params", async () => {
    const app = express();
    app.use((req, _res, next) => {
      req.appContext = { appId: "app-1", apiKeyRole: "READONLY", keyId: "k1" };
      next();
    });
    app.use(leaderboardsRouter);

    const response = await request(app)
      .get("/leaderboards")
      .query({ metric: "Consistency XP", scope: "GLOBAL", periodKey: "2026-02-14", limit: 10 });

    expect(response.status).toBe(200);
    expect(getLeaderboard).toHaveBeenCalledWith("app-1", "Consistency XP", "2026-02-14", "GLOBAL", 10, undefined);
  });
});

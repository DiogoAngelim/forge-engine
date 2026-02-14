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

import { achievementsRouter } from "../src/modules/achievements/achievements.routes";

describe("POST /achievements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    execute.mockResolvedValue({ rows: [{ id: "ach-1", code: "first_win" }] });
  });

  it("creates an achievement", async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.appContext = { appId: "app-1", apiKeyRole: "ADMIN", keyId: "k1" };
      next();
    });
    app.use(achievementsRouter);

    const response = await request(app).post("/achievements").send({
      code: "first_win",
      name: "First Win",
      kind: "MILESTONE",
      conditions: { target: 1 },
      hidden: false,
      repeatable: false
    });

    expect(response.status).toBe(201);
    expect(response.body.achievement).toEqual({ id: "ach-1", code: "first_win" });
    expect(execute).toHaveBeenCalledTimes(2);
  });
});

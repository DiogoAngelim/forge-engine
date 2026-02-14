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

import { seasonsRouter } from "../src/modules/seasons/seasons.routes";

describe("POST /seasons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    execute.mockResolvedValue({ rows: [{ id: "season-1", name: "Season 1" }] });
  });

  it("creates a season", async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.appContext = { appId: "app-1", apiKeyRole: "ADMIN", keyId: "k1" };
      next();
    });
    app.use(seasonsRouter);

    const response = await request(app).post("/seasons").send({
      name: "Season 1",
      startsAt: "2026-02-01T00:00:00.000Z",
      endsAt: "2026-03-01T00:00:00.000Z",
      resetXpOnStart: true,
      isActive: true
    });

    expect(response.status).toBe(201);
    expect(response.body.season).toEqual({ id: "season-1", name: "Season 1" });
    expect(execute).toHaveBeenCalledTimes(2);
  });
});

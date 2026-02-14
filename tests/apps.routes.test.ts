import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { transaction, execute } = vi.hoisted(() => ({
  transaction: vi.fn(),
  execute: vi.fn()
}));

vi.mock("../src/infra/db/client", () => ({
  db: {
    transaction,
    execute
  }
}));

import { appsRouter } from "../src/modules/apps/apps.routes";

describe("POST /apps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation(async (callback: (tx: { execute: typeof execute }) => Promise<void>) => {
      await callback({ execute });
    });
    execute.mockResolvedValue({ rows: [{ id: "finance-app", name: "Finance" }] });
  });

  it("creates app and returns bootstrap API key", async () => {
    const app = express();
    app.use(express.json());
    app.use(appsRouter);
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(400).json({ error: err.message });
    });

    const response = await request(app).post("/apps").send({ id: "finance-app", name: "Finance" });

    expect(response.status).toBe(201);
    expect(response.body.app).toEqual({ id: "finance-app", name: "Finance" });
    expect(response.body.bootstrapApiKey).toMatch(/^fge_/);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(3);
  });
});

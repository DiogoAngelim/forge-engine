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

import { currencyRouter } from "../src/modules/currency/currency.routes";

describe("POST /currency/spend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    execute
      .mockResolvedValueOnce({ rows: [{ id: "user-1" }] })
      .mockResolvedValueOnce({ rows: [{ total: 100 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
  });

  it("spends currency and writes audit log", async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.appContext = { appId: "app-1", apiKeyRole: "ADMIN", keyId: "k1" };
      next();
    });
    app.use(currencyRouter);

    const response = await request(app).post("/currency/spend").send({
      userId: "u-1",
      currency: "coins",
      amount: 25,
      reason: "unlock",
      metadata: { item: "freeze" }
    });

    expect(response.status).toBe(201);
    expect(response.body.transaction.currency).toBe("coins");
    expect(response.body.transaction.amount).toBe(-25);
    expect(response.body.transaction.balanceAfter).toBe(75);
    expect(execute).toHaveBeenCalledTimes(4);
  });
});

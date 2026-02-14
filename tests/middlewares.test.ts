import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { adminOnly } from "../src/infra/http/middlewares/admin";
import { errorHandler, notFoundHandler } from "../src/infra/http/middlewares/errorHandler";
import { AppError, ForbiddenError, UnauthorizedError } from "../src/shared/errors";

vi.mock("../src/config/logger", () => ({
  logger: {
    error: vi.fn()
  }
}));

describe("adminOnly middleware", () => {
  it("throws unauthorized when appContext missing", () => {
    expect(() => adminOnly({} as never, {} as never, vi.fn())).toThrow(UnauthorizedError);
  });

  it("throws forbidden when role is not admin", () => {
    const req = { appContext: { apiKeyRole: "INGEST" } } as never;
    expect(() => adminOnly(req, {} as never, vi.fn())).toThrow(ForbiddenError);
  });

  it("calls next for admin", () => {
    const next = vi.fn();
    const req = { appContext: { apiKeyRole: "ADMIN" } } as never;
    adminOnly(req, {} as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("error handlers", () => {
  it("returns 404 for notFoundHandler", () => {
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    notFoundHandler({} as never, { status, json } as never);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: "Route not found" });
  });

  it("handles zod errors", () => {
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();

    let caught: unknown;
    try {
      z.object({ name: z.string() }).parse({});
    } catch (error) {
      caught = error;
    }

    errorHandler(caught, { path: "/x" } as never, { status, json } as never, vi.fn());

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: "Validation failed" }));
  });

  it("handles AppError", () => {
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();

    errorHandler(new AppError("boom", 418), { path: "/x" } as never, { status, json } as never, vi.fn());

    expect(status).toHaveBeenCalledWith(418);
    expect(json).toHaveBeenCalledWith({ error: "boom" });
  });

  it("handles unknown errors", () => {
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();

    errorHandler(new Error("unknown"), { path: "/x" } as never, { status, json } as never, vi.fn());

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: "Internal server error" });
  });
});

import { describe, expect, it } from "vitest";
import { AppError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from "../src/shared/errors";
import { sha256 } from "../src/shared/hash";
import { getPeriodKey } from "../src/shared/time";

describe("shared utilities", () => {
  it("hashes with sha256 deterministically", () => {
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256("abc")).toBe(sha256("abc"));
  });

  it("formats UTC period key", () => {
    const date = new Date("2026-02-14T23:59:59.000Z");
    expect(getPeriodKey(date)).toBe("2026-02-14");
  });

  it("constructs all domain errors with proper status", () => {
    const appError = new AppError("bad", 422);
    expect(appError.statusCode).toBe(422);

    expect(new UnauthorizedError().statusCode).toBe(401);
    expect(new UnauthorizedError("x").message).toBe("x");

    expect(new ForbiddenError().statusCode).toBe(403);
    expect(new ForbiddenError("y").message).toBe("y");

    expect(new NotFoundError().statusCode).toBe(404);
    expect(new NotFoundError("z").message).toBe("z");

    expect(new ConflictError().statusCode).toBe(409);
    expect(new ConflictError("w").message).toBe("w");
  });
});

import { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../../../shared/errors";

export const adminOnly = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.appContext) {
    throw new UnauthorizedError("Missing app context");
  }
  if (req.appContext.apiKeyRole !== "ADMIN") {
    throw new ForbiddenError("Admin scope required");
  }
  next();
};

import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";
import { logger } from "../../../config/logger";
import { AppError } from "../../../shared/errors";

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(StatusCodes.NOT_FOUND).json({
    error: "Route not found"
  });
};

export const errorHandler = (error: unknown, req: Request, res: Response): void => {
  if (error instanceof ZodError) {
    res.status(StatusCodes.BAD_REQUEST).json({
      error: "Validation failed",
      details: error.flatten()
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message
    });
    return;
  }

  logger.error({ err: error, path: req.path }, "Unhandled error");
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    error: "Internal server error"
  });
};

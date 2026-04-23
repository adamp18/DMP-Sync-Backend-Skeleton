import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFoundHandler(
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    req.log.warn({ err }, "Validation error");
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        details: err.issues,
      },
    });
    return;
  }

  if (err instanceof HttpError) {
    req.log.warn({ err }, "HTTP error");
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  req.log.error({ err }, "Unhandled error");
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Internal server error" },
  });
}

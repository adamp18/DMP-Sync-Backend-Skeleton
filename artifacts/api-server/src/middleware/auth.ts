import type { Request, Response, NextFunction } from "express";

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser;
  }
}

/**
 * JWT validation middleware. Stub for now — real implementation comes in the
 * next step. When wired up it will verify the bearer token using
 * `env.JWT_SECRET`, attach `req.user`, and reject invalid tokens with 401.
 */
export function requireAuth(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next();
}

import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";
import { HttpError } from "./error.js";
import { verifyAccessToken } from "../lib/auth.js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: User["role"];
  status: User["status"];
  merchantId: string | null;
}

declare module "express" {
  interface Request {
    user?: AuthenticatedUser;
  }
}

function unauthorized(message = "Authentication required"): HttpError {
  return new HttpError(401, "UNAUTHORIZED", message);
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.header("authorization");
    if (!header || !header.toLowerCase().startsWith("bearer ")) {
      throw unauthorized();
    }
    const token = header.slice("bearer ".length).trim();
    if (!token) throw unauthorized();

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw unauthorized("Invalid or expired access token");
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.sub))
      .limit(1);

    if (!user || user.status !== "active") {
      throw unauthorized("Account is not active");
    }

    (req as Request & { user: AuthenticatedUser }).user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      merchantId: user.merchantId,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(
  ...roles: Array<AuthenticatedUser["role"]>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, _res, next) => {
    const u = (req as Request & { user?: AuthenticatedUser }).user;
    if (!u) return next(unauthorized());
    if (!roles.includes(u.role)) {
      return next(new HttpError(403, "FORBIDDEN", "Insufficient permissions"));
    }
    next();
  };
}

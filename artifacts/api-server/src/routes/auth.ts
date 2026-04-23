import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  merchantsTable,
  sessionsTable,
  usersTable,
  type User,
} from "@workspace/db";
import { HttpError } from "../middleware/error.js";
import { requireAuth } from "../middleware/auth.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
  signAccessToken,
  verifyPassword,
} from "../lib/auth.js";

const router: IRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

const INVALID_CREDENTIALS = new HttpError(
  401,
  "INVALID_CREDENTIALS",
  "Invalid email or password",
);

function clientIp(req: Request): string | null {
  const fwd = req.header("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.ip ?? null;
}

async function buildUserProfile(
  user: User,
): Promise<{
  id: string;
  email: string;
  role: User["role"];
  status: User["status"];
  merchantId: string | null;
  merchantName: string | null;
  lastLoginAt: string | null;
}> {
  let merchantName: string | null = null;
  if (user.merchantId) {
    const [m] = await db
      .select({ name: merchantsTable.name })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, user.merchantId))
      .limit(1);
    merchantName = m?.name ?? null;
  }
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    merchantId: user.merchantId,
    merchantName,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function issueSession(
  user: User,
  req: Request,
  executor: typeof db | Tx = db,
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    merchantId: user.merchantId,
  });
  const refreshToken = generateRefreshToken();
  await executor.insert(sessionsTable).values({
    userId: user.id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    userAgent: req.header("user-agent") ?? null,
    ipAddress: clientIp(req),
    expiresAt: refreshTokenExpiresAt(),
  });
  return { accessToken, refreshToken };
}

router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const [user] = await db
        .select()
        .from(usersTable)
        .where(sql`lower(${usersTable.email}) = lower(${email})`)
        .limit(1);

      // Constant-ish behavior: still hash-compare against a dummy if no user,
      // to reduce timing/branch leakage about email existence.
      if (!user) {
        await verifyPassword(
          password,
          "$2a$12$CwTycUXWue0Thq9StjUM0uJ8.lmZQ8z6m1mP6V9p0bC1cUO2H3wde",
        );
        throw INVALID_CREDENTIALS;
      }

      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) throw INVALID_CREDENTIALS;

      if (user.status !== "active") throw INVALID_CREDENTIALS;

      // Non-super_admin users must belong to an active merchant.
      if (user.role !== "super_admin") {
        if (!user.merchantId) throw INVALID_CREDENTIALS;
        const [m] = await db
          .select({ status: merchantsTable.status })
          .from(merchantsTable)
          .where(eq(merchantsTable.id, user.merchantId))
          .limit(1);
        if (!m || m.status !== "active") throw INVALID_CREDENTIALS;
      }

      const tokens = await issueSession(user, req);
      await db
        .update(usersTable)
        .set({ lastLoginAt: new Date() })
        .where(eq(usersTable.id, user.id));

      const fresh = { ...user, lastLoginAt: new Date() };
      const profile = await buildUserProfile(fresh);
      res.status(200).json({ ...tokens, user: profile });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/refresh",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      const tokenHash = hashRefreshToken(refreshToken);

      const invalid = new HttpError(
        401,
        "INVALID_REFRESH_TOKEN",
        "Refresh token is invalid, revoked, or expired",
      );

      // Rotate atomically in a transaction so a failed insert never strands
      // the caller with a revoked-but-not-replaced refresh token.
      const result = await db.transaction(async (tx) => {
        const now = new Date();
        const revoked = await tx
          .update(sessionsTable)
          .set({ revokedAt: now })
          .where(
            and(
              eq(sessionsTable.refreshTokenHash, tokenHash),
              isNull(sessionsTable.revokedAt),
              sql`${sessionsTable.expiresAt} > now()`,
            ),
          )
          .returning();

        const session = revoked[0];
        if (!session) throw invalid;

        const [user] = await tx
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, session.userId))
          .limit(1);
        if (!user || user.status !== "active") throw invalid;

        // Mirror /login policy: non-super-admins MUST belong to an active merchant.
        if (user.role !== "super_admin") {
          if (!user.merchantId) throw invalid;
          const [m] = await tx
            .select({ status: merchantsTable.status })
            .from(merchantsTable)
            .where(eq(merchantsTable.id, user.merchantId))
            .limit(1);
          if (!m || m.status !== "active") throw invalid;
        }

        const tokens = await issueSession(user, req, tx);
        return { tokens, user };
      });

      const profile = await buildUserProfile(result.user);
      res.status(200).json({ ...result.tokens, user: profile });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/logout",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = logoutSchema.parse(req.body ?? {});
      const userId = req.user!.id;
      const now = new Date();

      if (body.refreshToken) {
        await db
          .update(sessionsTable)
          .set({ revokedAt: now })
          .where(
            and(
              eq(sessionsTable.userId, userId),
              eq(
                sessionsTable.refreshTokenHash,
                hashRefreshToken(body.refreshToken),
              ),
              isNull(sessionsTable.revokedAt),
            ),
          );
      } else {
        await db
          .update(sessionsTable)
          .set({ revokedAt: now })
          .where(
            and(
              eq(sessionsTable.userId, userId),
              isNull(sessionsTable.revokedAt),
            ),
          );
      }

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/whoami",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, req.user!.id))
        .limit(1);
      if (!user) {
        throw new HttpError(401, "UNAUTHORIZED", "User not found");
      }
      const profile = await buildUserProfile(user);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },
);

export default router;

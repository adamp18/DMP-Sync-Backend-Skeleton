import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "./env.js";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const BCRYPT_COST = 12;

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: "super_admin" | "merchant_admin" | "merchant_user";
  merchantId: string | null;
}

export function signAccessToken(payload: {
  userId: string;
  role: AccessTokenPayload["role"];
  merchantId: string | null;
}): string {
  const opts: SignOptions = {
    algorithm: "HS256",
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };
  return jwt.sign(
    {
      sub: payload.userId,
      role: payload.role,
      merchantId: payload.merchantId,
    },
    env.JWT_SECRET,
    opts,
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"],
  });
  if (typeof decoded === "string") {
    throw new Error("Unexpected token payload");
  }
  return decoded as AccessTokenPayload;
}

export function generateRefreshToken(): string {
  // 48 random bytes → 64-char base64url. Opaque, NOT a JWT.
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiresAt(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

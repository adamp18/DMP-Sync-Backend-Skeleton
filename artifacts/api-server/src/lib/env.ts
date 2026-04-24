import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  // NOTE: refresh tokens are opaque random strings, not JWTs, so no
  // separate signing secret is required. Server-side revocation is enforced
  // via the `sessions` table.
  ADMIN_UI_ORIGIN: z.string().min(1, "ADMIN_UI_ORIGIN is required"),
  // Comma-separated full chrome-extension:// origins for the production
  // allowlist (e.g. "chrome-extension://abcdefghijklmnopqrstuvwxyzabcdef").
  // Ignored in development, where any chrome-extension:// origin is allowed
  // (unpacked extension IDs differ per machine and per reload).
  EXTENSION_ORIGIN: z.string().default(""),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    "Invalid environment configuration:",
    JSON.stringify(parsed.error.format(), null, 2),
  );
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

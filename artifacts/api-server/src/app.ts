import express, { type Express } from "express";
import cors from "cors";
import * as pinoHttpModule from "pino-http";

// pino-http is published as CJS; with NodeNext+ESM the default callable lives
// under either `.default` or the namespace itself, depending on the loader.
const pinoHttp = ((pinoHttpModule as unknown as {
  default?: unknown;
}).default ?? pinoHttpModule) as unknown as (
  opts: Record<string, unknown>,
) => import("express").RequestHandler;
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

const app: Express = express();

const isProduction = env.NODE_ENV === "production";

// Exact-origin allowlist for the admin portal and any other first-party web
// frontends. Comma-separated in env; applies in both development and
// production.
const allowedOrigins = new Set(
  env.ADMIN_UI_ORIGIN.split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);

// Chrome extension policy:
//   - Production: ONLY the exact `chrome-extension://<id>` origins listed in
//     EXTENSION_ORIGIN (comma-separated) are accepted. Each entry is the full
//     origin of a published Web Store extension build.
//   - Development: ANY `chrome-extension://*` origin is accepted, because
//     unpacked extension IDs differ per machine and change every reload.
const extensionAllowlist = new Set(
  env.EXTENSION_ORIGIN.split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);

function isExtensionOriginAllowed(origin: string): boolean {
  if (!origin.startsWith("chrome-extension://")) return false;
  if (!isProduction) return true;
  return extensionAllowlist.has(origin);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: { id?: unknown; method?: string; url?: string }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: { statusCode?: number }) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin requests and non-browser clients (e.g. curl) send no Origin.
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      if (isExtensionOriginAllowed(origin)) return callback(null, true);
      // Disallowed: don't throw — just omit CORS headers. The browser will
      // block the response, and the server log stays clean (no spurious 500s).
      return callback(null, false);
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

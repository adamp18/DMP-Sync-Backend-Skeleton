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

const allowedOrigins = new Set(
  env.ADMIN_UI_ORIGIN.split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);

const extensionOriginPrefixes = env.EXTENSION_ORIGIN.split(",")
  .map((o: string) => o.trim())
  .filter(Boolean);

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
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      if (extensionOriginPrefixes.some((p: string) => origin.startsWith(p))) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
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

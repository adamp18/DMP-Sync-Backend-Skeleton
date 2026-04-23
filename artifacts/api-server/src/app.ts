import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { env } from "./lib/env";
import { logger } from "./lib/logger";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/error";

const app: Express = express();

const allowedOrigins = new Set(
  env.ADMIN_UI_ORIGIN.split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);

const extensionOriginPrefixes = env.EXTENSION_ORIGIN.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (curl, server-to-server, health checks).
      if (!origin) return callback(null, true);

      if (allowedOrigins.has(origin)) return callback(null, true);

      // Allow Chrome extension origins (configurable via EXTENSION_ORIGIN).
      if (extensionOriginPrefixes.some((p) => origin.startsWith(p))) {
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

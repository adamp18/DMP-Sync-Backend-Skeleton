import app from "./app.js";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";

app.listen(env.PORT, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port: env.PORT }, "Server listening");
});

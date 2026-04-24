import { makeDb } from "@workspace/db";
import { env } from "./lib/env.js";

const { db, pool } = makeDb(env.DATABASE_URL);

export { db, pool };

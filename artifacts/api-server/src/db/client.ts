import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../lib/env";
import * as schema from "./schema";

const { Pool } = pg;

export const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

export type Database = typeof db;

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export type Schema = typeof schema;
export type Db = NodePgDatabase<Schema>;

export function makeDb(url: string): { db: Db; pool: pg.Pool } {
  if (!url) {
    throw new Error("makeDb requires a non-empty connection string");
  }
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db: Db = drizzle(pool, { schema });

export * from "./schema";

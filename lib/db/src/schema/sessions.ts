import { sql } from "drizzle-orm";
import { index, inet, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const sessionsTable = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    // sha256 hex of the refresh token. Never store the raw token.
    refreshTokenHash: text("refresh_token_hash").notNull().unique(),

    userAgent: text("user_agent"),
    ipAddress: inet("ip_address"),

    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    // null = active session.
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({
  id: true,
  issuedAt: true,
});
export const selectSessionSchema = createSelectSchema(sessionsTable);
export type Session = typeof sessionsTable.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

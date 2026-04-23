import { sql } from "drizzle-orm";
import {
  check,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { userRoleEnum, userStatusEnum } from "./enums";
import { merchantsTable } from "./merchants";

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

    // Nullable: super_admin users have no merchant.
    merchantId: uuid("merchant_id").references(() => merchantsTable.id, {
      onDelete: "cascade",
    }),

    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),

    role: userRoleEnum("role").notNull(),
    status: userStatusEnum("status").notNull().default("active"),

    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Case-insensitive unique email lookup.
    uniqueIndex("users_email_lower_unique_idx").on(sql`lower(${table.email})`),
    // super_admin <-> merchantId IS NULL biconditional.
    check(
      "users_super_admin_merchant_xor",
      sql`(${table.role} = 'super_admin' AND ${table.merchantId} IS NULL)
          OR (${table.role} <> 'super_admin' AND ${table.merchantId} IS NOT NULL)`,
    ),
  ],
);

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectUserSchema = createSelectSchema(usersTable);
export type User = typeof usersTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

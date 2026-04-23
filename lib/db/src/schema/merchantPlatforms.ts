import { sql } from "drizzle-orm";
import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { merchantPlatformStatusEnum } from "./enums";
import { merchantsTable } from "./merchants";

export const merchantPlatformsTable = pgTable(
  "merchant_platforms",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchantsTable.id, { onDelete: "cascade" }),

    // Open-ended machine ID: "servicetitan", "tekmetric", "housecallpro",
    // "jobber", etc. Intentionally NOT a pgEnum so we can add platforms
    // without a migration.
    platform: text("platform").notNull(),

    status: merchantPlatformStatusEnum("status").notNull().default("enabled"),

    // Per-platform settings (e.g. ServiceTitan tenant ID).
    config: jsonb("config").notNull().default(sql`'{}'::jsonb`),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("merchant_platforms_merchant_platform_unique_idx").on(
      table.merchantId,
      table.platform,
    ),
  ],
);

export const insertMerchantPlatformSchema = createInsertSchema(
  merchantPlatformsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const selectMerchantPlatformSchema = createSelectSchema(
  merchantPlatformsTable,
);
export type MerchantPlatform = typeof merchantPlatformsTable.$inferSelect;
export type InsertMerchantPlatform = z.infer<
  typeof insertMerchantPlatformSchema
>;

import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { merchantStatusEnum } from "./enums";

export const merchantsTable = pgTable(
  "merchants",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

    // Identity
    name: text("name").notNull(),
    slug: text("slug").notNull(),

    // Branding
    companyName: text("company_name").notNull(),
    logoUrl: text("logo_url"),
    payableToAddress: text("payable_to_address"),

    // Default email template (rendered at send time).
    defaultEmailTemplate: text("default_email_template").notNull().default(""),

    status: merchantStatusEnum("status").notNull().default("active"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("merchants_slug_unique_idx").on(table.slug),
  ],
);

export const insertMerchantSchema = createInsertSchema(merchantsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectMerchantSchema = createSelectSchema(merchantsTable);
export type Merchant = typeof merchantsTable.$inferSelect;
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;

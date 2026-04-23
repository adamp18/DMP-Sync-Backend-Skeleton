import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { merchantStatusEnum } from "./enums";

export const merchantsTable = pgTable("merchants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Branding
  companyName: text("company_name").notNull(),
  logoUrl: text("logo_url"),
  payableToAddress: text("payable_to_address"),

  // Default email template (rendered at send time)
  defaultEmailTemplate: text("default_email_template"),

  // Fluid Pay credentials. The API key is stored as ciphertext (encryption
  // wrapper to be added later); column is plain text/bytea-friendly today.
  fluidPayApiKeyCiphertext: text("fluid_pay_api_key_ciphertext"),
  fluidPayCardProcessorId: text("fluid_pay_card_processor_id"),
  fluidPayAchProcessorId: text("fluid_pay_ach_processor_id"),

  status: merchantStatusEnum("status").notNull().default("active"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertMerchantSchema = createInsertSchema(merchantsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectMerchantSchema = createSelectSchema(merchantsTable);
export type Merchant = typeof merchantsTable.$inferSelect;
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;

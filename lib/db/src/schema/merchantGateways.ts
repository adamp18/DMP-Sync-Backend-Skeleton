import { sql } from "drizzle-orm";
import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gatewayNameEnum, merchantGatewayStatusEnum } from "./enums";
import { merchantsTable } from "./merchants";

export const merchantGatewaysTable = pgTable(
  "merchant_gateways",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchantsTable.id, { onDelete: "cascade" }),

    gateway: gatewayNameEnum("gateway").notNull(),

    // Merchant-facing label, e.g. "Production FP", "NMI sandbox".
    displayLabel: text("display_label").notNull(),

    // Per-gateway credentials. Shape validated per-gateway in code; will be
    // wrapped with encryption later (treat as ciphertext-ready).
    credentials: jsonb("credentials").notNull().default(sql`'{}'::jsonb`),

    isPrimary: boolean("is_primary").notNull().default(false),

    status: merchantGatewayStatusEnum("status").notNull().default("active"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // At most one config per (merchant, gateway).
    uniqueIndex("merchant_gateways_merchant_gateway_unique_idx").on(
      table.merchantId,
      table.gateway,
    ),
    // Exactly one primary gateway per merchant (partial unique index).
    uniqueIndex("merchant_gateways_one_primary_per_merchant_idx")
      .on(table.merchantId)
      .where(sql`${table.isPrimary} = true`),
    // Required by composite FKs from terminals / vaulted_cards /
    // recurring_schedules / transactions to prevent cross-tenant linking.
    unique("merchant_gateways_id_merchant_id_unique").on(
      table.id,
      table.merchantId,
    ),
  ],
);

export const insertMerchantGatewaySchema = createInsertSchema(
  merchantGatewaysTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const selectMerchantGatewaySchema = createSelectSchema(
  merchantGatewaysTable,
);
export type MerchantGateway = typeof merchantGatewaysTable.$inferSelect;
export type InsertMerchantGateway = z.infer<typeof insertMerchantGatewaySchema>;

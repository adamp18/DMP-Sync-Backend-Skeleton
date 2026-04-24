import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vaultedCardStatusEnum } from "./enums";
import { merchantGatewaysTable } from "./merchantGateways";
import { merchantsTable } from "./merchants";
import { usersTable } from "./users";

export const vaultedCardsTable = pgTable(
  "vaulted_cards",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchantsTable.id, { onDelete: "cascade" }),

    // Tokens are gateway-scoped. Composite FK to merchant_gateways below
    // ensures the gateway belongs to the same merchant.
    merchantGatewayId: uuid("merchant_gateway_id").notNull(),

    // Loose customer linkage. The third-party platform (ServiceTitan etc.)
    // is the system of record for customers; we just record enough to find
    // the card again. All fields are optional because a one-off keyed card
    // can be vaulted before the customer is fully resolved upstream.
    sourcePlatform: text("source_platform"),
    externalCustomerId: text("external_customer_id"),
    customerName: text("customer_name"),
    customerEmail: text("customer_email"),

    // Gateway tokens. Shape varies by gateway; the payment-method token is
    // required (it's what we charge), the customer-vault id is optional and
    // gateway-dependent (FluidPay/NMI customer vault, etc.).
    gatewayCustomerVaultId: text("gateway_customer_vault_id"),
    gatewayPaymentMethodId: text("gateway_payment_method_id").notNull(),

    // Display-only card metadata. We never store, log, or accept raw PAN.
    cardBrand: text("card_brand"),
    cardLastFour: varchar("card_last_four", { length: 4 }),
    cardExpMonth: integer("card_exp_month"),
    cardExpYear: integer("card_exp_year"),
    cardholderName: text("cardholder_name"),

    status: vaultedCardStatusEnum("status").notNull().default("active"),

    // Cashier who saved the card. Nullable so user deletion doesn't cascade
    // into payment data.
    createdByUserId: uuid("created_by_user_id").references(
      () => usersTable.id,
      { onDelete: "set null" },
    ),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // The same gateway token should never appear twice in our system.
    uniqueIndex("vaulted_cards_gateway_pm_unique_idx").on(
      table.merchantGatewayId,
      table.gatewayPaymentMethodId,
    ),
    index("vaulted_cards_merchant_id_idx").on(table.merchantId),
    // "Show me all saved cards for this ServiceTitan customer at this merchant."
    index("vaulted_cards_external_customer_idx").on(
      table.merchantId,
      table.sourcePlatform,
      table.externalCustomerId,
    ),
    // Required by composite FKs from recurring_schedules / transactions.
    unique("vaulted_cards_id_merchant_id_unique").on(
      table.id,
      table.merchantId,
    ),
    foreignKey({
      columns: [table.merchantId, table.merchantGatewayId],
      foreignColumns: [
        merchantGatewaysTable.merchantId,
        merchantGatewaysTable.id,
      ],
      name: "vaulted_cards_merchant_gateway_composite_fk",
    })
      .onDelete("restrict")
      .onUpdate("no action"),
  ],
);

export const insertVaultedCardSchema = createInsertSchema(vaultedCardsTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export const selectVaultedCardSchema = createSelectSchema(vaultedCardsTable);
export type VaultedCard = typeof vaultedCardsTable.$inferSelect;
export type InsertVaultedCard = z.infer<typeof insertVaultedCardSchema>;

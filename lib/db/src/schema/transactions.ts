import { desc, sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import {
  gatewayNameEnum,
  transactionChannelEnum,
  transactionStatusEnum,
} from "./enums";
import { merchantGatewaysTable } from "./merchantGateways";
import { merchantsTable } from "./merchants";
import { recurringSchedulesTable } from "./recurringSchedules";
import { terminalsTable } from "./terminals";
import { usersTable } from "./users";
import { vaultedCardsTable } from "./vaultedCards";

export const transactionsTable = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchantsTable.id, { onDelete: "restrict" }),

    // Cashier who initiated the action. Nullable so that:
    //   1. system-driven recurring runs (no human in the loop) are representable
    //   2. user deletion never wipes out audit history
    userId: uuid("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),

    // How the action was initiated. Drives which gateway adapter call was
    // made and what optional refs are expected to be set on this row.
    channel: transactionChannelEnum("channel").notNull(),

    // Source platform of the action (e.g. "servicetitan"). Nullable —
    // some channels (e.g. ad-hoc keyed card / terminal sale outside any
    // host platform context) have no upstream platform.
    sourcePlatform: text("source_platform"),

    // Gateway adapter that handled this transaction. The enum is stored on
    // the row for audit integrity even if the merchant later switches
    // primary gateway or removes the gateway config; the FK is set null on
    // gateway deletion so we keep the audit row.
    gateway: gatewayNameEnum("gateway").notNull(),
    merchantGatewayId: uuid("merchant_gateway_id"),

    // Invoice / amount fields. external_invoice_id is nullable because
    // not every channel originates from an upstream invoice (e.g. a
    // walk-in terminal sale).
    externalInvoiceId: text("external_invoice_id"),
    invoiceNumber: text("invoice_number"),

    // Dollars, not cents.
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),

    customerName: text("customer_name"),
    customerEmail: text("customer_email"),

    // Gateway-side identifiers. All nullable: which one(s) get populated
    // depends on the channel + outcome.
    gatewayInvoiceId: text("gateway_invoice_id"),
    gatewayTransactionId: text("gateway_transaction_id"),
    paymentLinkUrl: text("payment_link_url"),

    // Channel-specific references. Each is set only when relevant:
    //   terminal           -> terminalId
    //   saved_card / ach   -> vaultedCardId
    //   recurring          -> recurringScheduleId (+ vaultedCardId)
    //   refund / void      -> parentTransactionId
    // Cross-tenant safety is enforced via composite FKs below.
    terminalId: uuid("terminal_id"),
    vaultedCardId: uuid("vaulted_card_id"),
    recurringScheduleId: uuid("recurring_schedule_id"),
    parentTransactionId: uuid("parent_transaction_id"),

    status: transactionStatusEnum("status").notNull(),
    errorMessage: text("error_message"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Recent activity per merchant: WHERE merchant_id = ? ORDER BY created_at DESC
    index("transactions_merchant_created_at_idx").on(
      table.merchantId,
      desc(table.createdAt),
    ),
    index("transactions_user_id_idx").on(table.userId),
    // Lookup by source platform's invoice ID (e.g. dedupe / cross-reference).
    index("transactions_source_external_invoice_idx").on(
      table.sourcePlatform,
      table.externalInvoiceId,
    ),
    // "Show me all refunds/voids of this sale."
    index("transactions_parent_id_idx").on(table.parentTransactionId),
    index("transactions_recurring_schedule_id_idx").on(
      table.recurringScheduleId,
    ),
    index("transactions_vaulted_card_id_idx").on(table.vaultedCardId),
    index("transactions_terminal_id_idx").on(table.terminalId),

    // Required so transactions can composite-FK reference itself for
    // refund/void parent linkage in the same merchant scope.
    unique("transactions_id_merchant_id_unique").on(
      table.id,
      table.merchantId,
    ),

    // Composite FKs that require all referenced rows to belong to the same
    // merchant as this transaction. Prevents one tenant from issuing a
    // refund against another tenant's sale, charging another tenant's
    // vaulted card, etc.
    foreignKey({
      columns: [table.merchantId, table.merchantGatewayId],
      foreignColumns: [
        merchantGatewaysTable.merchantId,
        merchantGatewaysTable.id,
      ],
      name: "transactions_merchant_gateway_composite_fk",
    })
      .onDelete("set null")
      .onUpdate("no action"),
    foreignKey({
      columns: [table.merchantId, table.terminalId],
      foreignColumns: [terminalsTable.merchantId, terminalsTable.id],
      name: "transactions_merchant_terminal_composite_fk",
    })
      .onDelete("set null")
      .onUpdate("no action"),
    foreignKey({
      columns: [table.merchantId, table.vaultedCardId],
      foreignColumns: [vaultedCardsTable.merchantId, vaultedCardsTable.id],
      name: "transactions_merchant_vaulted_card_composite_fk",
    })
      .onDelete("set null")
      .onUpdate("no action"),
    foreignKey({
      columns: [table.merchantId, table.recurringScheduleId],
      foreignColumns: [
        recurringSchedulesTable.merchantId,
        recurringSchedulesTable.id,
      ],
      name: "transactions_merchant_recurring_schedule_composite_fk",
    })
      .onDelete("set null")
      .onUpdate("no action"),
    foreignKey({
      columns: [table.merchantId, table.parentTransactionId],
      foreignColumns: [table.merchantId, table.id],
      name: "transactions_merchant_parent_composite_fk",
    })
      .onDelete("restrict")
      .onUpdate("no action"),

    // A transaction can never be its own parent.
    check(
      "transactions_parent_not_self",
      sql`${table.parentTransactionId} IS NULL
          OR ${table.parentTransactionId} <> ${table.id}`,
    ),
    // Refunds and voids must reference the original transaction. Other
    // channels must NOT have a parent (they originate the chain).
    check(
      "transactions_parent_required_for_refund_void",
      sql`(${table.channel} IN ('refund', 'void') AND ${table.parentTransactionId} IS NOT NULL)
          OR (${table.channel} NOT IN ('refund', 'void') AND ${table.parentTransactionId} IS NULL)`,
    ),
  ],
);

export const insertTransactionSchema = createInsertSchema(
  transactionsTable,
).omit({ id: true, createdAt: true });
export const selectTransactionSchema = createSelectSchema(transactionsTable);
export type Transaction = typeof transactionsTable.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

import { sql, desc } from "drizzle-orm";
import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gatewayNameEnum, transactionStatusEnum } from "./enums";
import { merchantsTable } from "./merchants";
import { usersTable } from "./users";

export const transactionsTable = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchantsTable.id, { onDelete: "restrict" }),

    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),

    sourcePlatform: text("source_platform").notNull(),

    // Which gateway adapter handled this transaction. Stored on the row for
    // audit integrity even if the merchant later switches primary gateway.
    gateway: gatewayNameEnum("gateway").notNull(),

    externalInvoiceId: text("external_invoice_id").notNull(),
    invoiceNumber: text("invoice_number"),

    // Dollars, not cents.
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),

    customerName: text("customer_name"),
    customerEmail: text("customer_email"),

    // The gateway's ID for the invoice it created. Nullable on failure.
    gatewayInvoiceId: text("gateway_invoice_id"),
    paymentLinkUrl: text("payment_link_url"),

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
  ],
);

export const insertTransactionSchema = createInsertSchema(
  transactionsTable,
).omit({ id: true, createdAt: true });
export const selectTransactionSchema = createSelectSchema(transactionsTable);
export type Transaction = typeof transactionsTable.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

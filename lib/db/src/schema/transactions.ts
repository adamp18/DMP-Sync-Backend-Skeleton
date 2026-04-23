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
import { transactionStatusEnum } from "./enums";
import { merchantsTable } from "./merchants";
import { usersTable } from "./users";

export const transactionsTable = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchantsTable.id, { onDelete: "cascade" }),

    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),

    sourcePlatform: text("source_platform").notNull(),
    externalInvoiceId: text("external_invoice_id").notNull(),
    invoiceNumber: text("invoice_number").notNull(),

    // Dollars, not cents.
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),

    customerName: text("customer_name"),
    customerEmail: text("customer_email"),

    fluidPayInvoiceId: text("fluid_pay_invoice_id"),
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
  ],
);

export const insertTransactionSchema = createInsertSchema(
  transactionsTable,
).omit({ id: true, createdAt: true });
export const selectTransactionSchema = createSelectSchema(transactionsTable);
export type Transaction = typeof transactionsTable.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

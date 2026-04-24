import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { recurringFrequencyEnum, recurringScheduleStatusEnum } from "./enums";
import { merchantGatewaysTable } from "./merchantGateways";
import { merchantsTable } from "./merchants";
import { usersTable } from "./users";
import { vaultedCardsTable } from "./vaultedCards";

export const recurringSchedulesTable = pgTable(
  "recurring_schedules",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchantsTable.id, { onDelete: "cascade" }),

    // The schedule lives on a specific gateway; composite FK enforces
    // same-merchant binding. Restrict deletion: we shouldn't be able to
    // remove a gateway config that still has live schedules running.
    merchantGatewayId: uuid("merchant_gateway_id").notNull(),

    // Card to charge. Composite FK enforces same-merchant binding. Restrict
    // — a card deletion attempt while a schedule is active should fail loudly
    // so the caller cancels the schedule first.
    vaultedCardId: uuid("vaulted_card_id").notNull(),

    // The gateway's id for the schedule/subscription/plan it created on its
    // side. Nullable until the create call succeeds.
    gatewayScheduleId: text("gateway_schedule_id"),

    // Per-installment amount in dollars.
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),

    frequency: recurringFrequencyEnum("frequency").notNull(),

    startDate: date("start_date").notNull(),
    // Either an end date OR a fixed installment count (or neither = open-ended).
    endDate: date("end_date"),
    totalInstallments: integer("total_installments"),
    completedInstallments: integer("completed_installments")
      .notNull()
      .default(0),

    nextRunAt: timestamp("next_run_at", { withTimezone: true }),

    status: recurringScheduleStatusEnum("status")
      .notNull()
      .default("active"),

    // Optional linkage back to the originating invoice on the source platform.
    sourcePlatform: text("source_platform"),
    externalInvoiceId: text("external_invoice_id"),

    // Cashier who set up the schedule. Nullable so user deletion doesn't
    // cascade into payment data.
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
    index("recurring_schedules_merchant_id_idx").on(table.merchantId),
    index("recurring_schedules_vaulted_card_id_idx").on(table.vaultedCardId),
    // Worker query: "what schedules are due to run?"
    index("recurring_schedules_due_idx")
      .on(table.nextRunAt)
      .where(sql`${table.status} = 'active'`),
    check(
      "recurring_schedules_installments_valid",
      sql`${table.completedInstallments} >= 0
          AND (${table.totalInstallments} IS NULL OR ${table.totalInstallments} > 0)
          AND (${table.totalInstallments} IS NULL OR ${table.completedInstallments} <= ${table.totalInstallments})`,
    ),
    check(
      "recurring_schedules_end_after_start",
      sql`${table.endDate} IS NULL OR ${table.endDate} >= ${table.startDate}`,
    ),
    // Required by composite FKs from transactions.
    unique("recurring_schedules_id_merchant_id_unique").on(
      table.id,
      table.merchantId,
    ),
    foreignKey({
      columns: [table.merchantId, table.merchantGatewayId],
      foreignColumns: [
        merchantGatewaysTable.merchantId,
        merchantGatewaysTable.id,
      ],
      name: "recurring_schedules_merchant_gateway_composite_fk",
    })
      .onDelete("restrict")
      .onUpdate("no action"),
    foreignKey({
      columns: [table.merchantId, table.vaultedCardId],
      foreignColumns: [vaultedCardsTable.merchantId, vaultedCardsTable.id],
      name: "recurring_schedules_merchant_vaulted_card_composite_fk",
    })
      .onDelete("restrict")
      .onUpdate("no action"),
  ],
);

export const insertRecurringScheduleSchema = createInsertSchema(
  recurringSchedulesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const selectRecurringScheduleSchema = createSelectSchema(
  recurringSchedulesTable,
);
export type RecurringSchedule = typeof recurringSchedulesTable.$inferSelect;
export type InsertRecurringSchedule = z.infer<
  typeof insertRecurringScheduleSchema
>;

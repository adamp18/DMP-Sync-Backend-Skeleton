import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
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
import { terminalStatusEnum } from "./enums";
import { merchantGatewaysTable } from "./merchantGateways";
import { merchantsTable } from "./merchants";

export const terminalsTable = pgTable(
  "terminals",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchantsTable.id, { onDelete: "cascade" }),

    // Bound to a specific gateway config; enforced via composite FK below
    // so we can't accidentally link a terminal to a gateway from a
    // different merchant.
    merchantGatewayId: uuid("merchant_gateway_id").notNull(),

    // Cashier-facing label, e.g. "Front desk Dejavoo".
    displayLabel: text("display_label").notNull(),

    // The gateway's identifier for the device:
    //   Dejavoo SPIn  -> TPN / device id
    //   NMI           -> terminal id
    //   FluidPay      -> terminal id
    externalDeviceId: text("external_device_id").notNull(),

    // Per-gateway extras (Dejavoo authkey, register #, location code, etc.).
    config: jsonb("config").notNull().default(sql`'{}'::jsonb`),

    status: terminalStatusEnum("status").notNull().default("active"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // A given gateway config can't register the same physical device twice.
    uniqueIndex("terminals_gateway_device_unique_idx").on(
      table.merchantGatewayId,
      table.externalDeviceId,
    ),
    index("terminals_merchant_id_idx").on(table.merchantId),
    // Required by composite FKs from transactions.
    unique("terminals_id_merchant_id_unique").on(table.id, table.merchantId),
    // Composite FK: a terminal's gateway config must belong to the same
    // merchant as the terminal itself.
    foreignKey({
      columns: [table.merchantId, table.merchantGatewayId],
      foreignColumns: [
        merchantGatewaysTable.merchantId,
        merchantGatewaysTable.id,
      ],
      name: "terminals_merchant_gateway_composite_fk",
    })
      .onDelete("cascade")
      .onUpdate("no action"),
  ],
);

export const insertTerminalSchema = createInsertSchema(terminalsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectTerminalSchema = createSelectSchema(terminalsTable);
export type Terminal = typeof terminalsTable.$inferSelect;
export type InsertTerminal = z.infer<typeof insertTerminalSchema>;

import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "merchant_admin",
  "merchant_user",
]);

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "suspended",
]);

export const merchantStatusEnum = pgEnum("merchant_status", [
  "active",
  "suspended",
]);

export const merchantPlatformStatusEnum = pgEnum("merchant_platform_status", [
  "enabled",
  "disabled",
]);

export const gatewayNameEnum = pgEnum("gateway_name", [
  "fluidpay",
  "nmi",
  "dejavoo_spin",
]);

export const merchantGatewayStatusEnum = pgEnum("merchant_gateway_status", [
  "active",
  "disabled",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "created",
  "failed",
]);

// One row in `transactions` per cashier-initiated payment action. The channel
// records *how* the action was initiated and is the discriminator the routing
// layer uses to decide which gateway adapter call to make.
export const transactionChannelEnum = pgEnum("transaction_channel", [
  "pay_by_link",
  "keyed_card",
  "terminal",
  "saved_card",
  "ach",
  "recurring",
  "refund",
  "void",
]);

export const terminalStatusEnum = pgEnum("terminal_status", [
  "active",
  "disabled",
]);

export const vaultedCardStatusEnum = pgEnum("vaulted_card_status", [
  "active",
  "deleted",
]);

export const recurringFrequencyEnum = pgEnum("recurring_frequency", [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "semiannually",
  "annually",
]);

export const recurringScheduleStatusEnum = pgEnum("recurring_schedule_status", [
  "active",
  "paused",
  "completed",
  "canceled",
]);

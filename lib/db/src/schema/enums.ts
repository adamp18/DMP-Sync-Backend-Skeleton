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

export const transactionStatusEnum = pgEnum("transaction_status", [
  "created",
  "failed",
]);

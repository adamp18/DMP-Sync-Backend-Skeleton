CREATE TYPE "public"."recurring_frequency" AS ENUM('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannually', 'annually');--> statement-breakpoint
CREATE TYPE "public"."recurring_schedule_status" AS ENUM('active', 'paused', 'completed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."terminal_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."transaction_channel" AS ENUM('pay_by_link', 'keyed_card', 'terminal', 'saved_card', 'ach', 'recurring', 'refund', 'void');--> statement-breakpoint
CREATE TYPE "public"."vaulted_card_status" AS ENUM('active', 'deleted');--> statement-breakpoint
CREATE TABLE "terminals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"merchant_gateway_id" uuid NOT NULL,
	"display_label" text NOT NULL,
	"external_device_id" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "terminal_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vaulted_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"merchant_gateway_id" uuid NOT NULL,
	"source_platform" text,
	"external_customer_id" text,
	"customer_name" text,
	"customer_email" text,
	"gateway_customer_vault_id" text,
	"gateway_payment_method_id" text NOT NULL,
	"card_brand" text,
	"card_last_four" varchar(4),
	"card_exp_month" integer,
	"card_exp_year" integer,
	"cardholder_name" text,
	"status" "vaulted_card_status" DEFAULT 'active' NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"merchant_gateway_id" uuid NOT NULL,
	"vaulted_card_id" uuid NOT NULL,
	"gateway_schedule_id" text,
	"amount" numeric(12, 2) NOT NULL,
	"frequency" "recurring_frequency" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"total_installments" integer,
	"completed_installments" integer DEFAULT 0 NOT NULL,
	"next_run_at" timestamp with time zone,
	"status" "recurring_schedule_status" DEFAULT 'active' NOT NULL,
	"source_platform" text,
	"external_invoice_id" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_schedules_installments_nonneg" CHECK ("recurring_schedules"."completed_installments" >= 0
          AND ("recurring_schedules"."total_installments" IS NULL OR "recurring_schedules"."total_installments" > 0))
);
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "source_platform" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "external_invoice_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "channel" "transaction_channel" NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "merchant_gateway_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "gateway_transaction_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "terminal_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "vaulted_card_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recurring_schedule_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "parent_transaction_id" uuid;--> statement-breakpoint
ALTER TABLE "terminals" ADD CONSTRAINT "terminals_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminals" ADD CONSTRAINT "terminals_merchant_gateway_id_merchant_gateways_id_fk" FOREIGN KEY ("merchant_gateway_id") REFERENCES "public"."merchant_gateways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaulted_cards" ADD CONSTRAINT "vaulted_cards_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaulted_cards" ADD CONSTRAINT "vaulted_cards_merchant_gateway_id_merchant_gateways_id_fk" FOREIGN KEY ("merchant_gateway_id") REFERENCES "public"."merchant_gateways"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaulted_cards" ADD CONSTRAINT "vaulted_cards_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_merchant_gateway_id_merchant_gateways_id_fk" FOREIGN KEY ("merchant_gateway_id") REFERENCES "public"."merchant_gateways"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_vaulted_card_id_vaulted_cards_id_fk" FOREIGN KEY ("vaulted_card_id") REFERENCES "public"."vaulted_cards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "terminals_gateway_device_unique_idx" ON "terminals" USING btree ("merchant_gateway_id","external_device_id");--> statement-breakpoint
CREATE INDEX "terminals_merchant_id_idx" ON "terminals" USING btree ("merchant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vaulted_cards_gateway_pm_unique_idx" ON "vaulted_cards" USING btree ("merchant_gateway_id","gateway_payment_method_id");--> statement-breakpoint
CREATE INDEX "vaulted_cards_merchant_id_idx" ON "vaulted_cards" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "vaulted_cards_external_customer_idx" ON "vaulted_cards" USING btree ("merchant_id","source_platform","external_customer_id");--> statement-breakpoint
CREATE INDEX "recurring_schedules_merchant_id_idx" ON "recurring_schedules" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "recurring_schedules_vaulted_card_id_idx" ON "recurring_schedules" USING btree ("vaulted_card_id");--> statement-breakpoint
CREATE INDEX "recurring_schedules_due_idx" ON "recurring_schedules" USING btree ("next_run_at") WHERE "recurring_schedules"."status" = 'active';--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchant_gateway_id_merchant_gateways_id_fk" FOREIGN KEY ("merchant_gateway_id") REFERENCES "public"."merchant_gateways"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_terminal_id_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."terminals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_vaulted_card_id_vaulted_cards_id_fk" FOREIGN KEY ("vaulted_card_id") REFERENCES "public"."vaulted_cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_schedule_id_recurring_schedules_id_fk" FOREIGN KEY ("recurring_schedule_id") REFERENCES "public"."recurring_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_parent_transaction_id_transactions_id_fk" FOREIGN KEY ("parent_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_parent_id_idx" ON "transactions" USING btree ("parent_transaction_id");--> statement-breakpoint
CREATE INDEX "transactions_recurring_schedule_id_idx" ON "transactions" USING btree ("recurring_schedule_id");--> statement-breakpoint
CREATE INDEX "transactions_vaulted_card_id_idx" ON "transactions" USING btree ("vaulted_card_id");--> statement-breakpoint
CREATE INDEX "transactions_terminal_id_idx" ON "transactions" USING btree ("terminal_id");
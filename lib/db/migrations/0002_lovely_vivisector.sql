ALTER TABLE "recurring_schedules" DROP CONSTRAINT "recurring_schedules_installments_nonneg";--> statement-breakpoint
ALTER TABLE "terminals" DROP CONSTRAINT "terminals_merchant_gateway_id_merchant_gateways_id_fk";
--> statement-breakpoint
ALTER TABLE "vaulted_cards" DROP CONSTRAINT "vaulted_cards_merchant_gateway_id_merchant_gateways_id_fk";
--> statement-breakpoint
ALTER TABLE "recurring_schedules" DROP CONSTRAINT "recurring_schedules_merchant_gateway_id_merchant_gateways_id_fk";
--> statement-breakpoint
ALTER TABLE "recurring_schedules" DROP CONSTRAINT "recurring_schedules_vaulted_card_id_vaulted_cards_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_merchant_gateway_id_merchant_gateways_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_terminal_id_terminals_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_vaulted_card_id_vaulted_cards_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_recurring_schedule_id_recurring_schedules_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_parent_transaction_id_transactions_id_fk";
--> statement-breakpoint
ALTER TABLE "merchant_gateways" ADD CONSTRAINT "merchant_gateways_id_merchant_id_unique" UNIQUE("id","merchant_id");--> statement-breakpoint
ALTER TABLE "terminals" ADD CONSTRAINT "terminals_id_merchant_id_unique" UNIQUE("id","merchant_id");--> statement-breakpoint
ALTER TABLE "vaulted_cards" ADD CONSTRAINT "vaulted_cards_id_merchant_id_unique" UNIQUE("id","merchant_id");--> statement-breakpoint
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_id_merchant_id_unique" UNIQUE("id","merchant_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_id_merchant_id_unique" UNIQUE("id","merchant_id");--> statement-breakpoint
ALTER TABLE "terminals" ADD CONSTRAINT "terminals_merchant_gateway_composite_fk" FOREIGN KEY ("merchant_id","merchant_gateway_id") REFERENCES "public"."merchant_gateways"("merchant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaulted_cards" ADD CONSTRAINT "vaulted_cards_merchant_gateway_composite_fk" FOREIGN KEY ("merchant_id","merchant_gateway_id") REFERENCES "public"."merchant_gateways"("merchant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_merchant_gateway_composite_fk" FOREIGN KEY ("merchant_id","merchant_gateway_id") REFERENCES "public"."merchant_gateways"("merchant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_merchant_vaulted_card_composite_fk" FOREIGN KEY ("merchant_id","vaulted_card_id") REFERENCES "public"."vaulted_cards"("merchant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchant_gateway_composite_fk" FOREIGN KEY ("merchant_id","merchant_gateway_id") REFERENCES "public"."merchant_gateways"("merchant_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchant_terminal_composite_fk" FOREIGN KEY ("merchant_id","terminal_id") REFERENCES "public"."terminals"("merchant_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchant_vaulted_card_composite_fk" FOREIGN KEY ("merchant_id","vaulted_card_id") REFERENCES "public"."vaulted_cards"("merchant_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchant_recurring_schedule_composite_fk" FOREIGN KEY ("merchant_id","recurring_schedule_id") REFERENCES "public"."recurring_schedules"("merchant_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchant_parent_composite_fk" FOREIGN KEY ("merchant_id","parent_transaction_id") REFERENCES "public"."transactions"("merchant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_installments_valid" CHECK ("recurring_schedules"."completed_installments" >= 0
          AND ("recurring_schedules"."total_installments" IS NULL OR "recurring_schedules"."total_installments" > 0)
          AND ("recurring_schedules"."total_installments" IS NULL OR "recurring_schedules"."completed_installments" <= "recurring_schedules"."total_installments"));--> statement-breakpoint
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_end_after_start" CHECK ("recurring_schedules"."end_date" IS NULL OR "recurring_schedules"."end_date" >= "recurring_schedules"."start_date");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_parent_not_self" CHECK ("transactions"."parent_transaction_id" IS NULL
          OR "transactions"."parent_transaction_id" <> "transactions"."id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_parent_required_for_refund_void" CHECK (("transactions"."channel" IN ('refund', 'void') AND "transactions"."parent_transaction_id" IS NOT NULL)
          OR ("transactions"."channel" NOT IN ('refund', 'void') AND "transactions"."parent_transaction_id" IS NULL));

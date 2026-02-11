CREATE TABLE "action_log" (
	"id" text PRIMARY KEY NOT NULL,
	"action_type" text NOT NULL,
	"actor" text DEFAULT 'system' NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"inputs" jsonb NOT NULL,
	"mutations" jsonb NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"billing_cycle" text,
	"plan" text,
	"terms" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_partner_links" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"partner_id" text NOT NULL,
	"attribution_pct" numeric(5, 2) DEFAULT '100' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"commission_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"one_time_commission_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"total_paid" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"joined_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partners_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "revenue_streams" (
	"id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"frequency" text,
	"start_date" text,
	"end_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_customer_id_clients_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_partner_links" ADD CONSTRAINT "customer_partner_links_customer_id_clients_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_partner_links" ADD CONSTRAINT "customer_partner_links_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_streams" ADD CONSTRAINT "revenue_streams_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;
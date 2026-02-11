CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sales_partner" text,
	"status" text DEFAULT 'active' NOT NULL,
	"pricing_model" text DEFAULT 'per_seat' NOT NULL,
	"per_seat_cost" numeric(10, 2),
	"seat_count" integer,
	"billing_cycle" text,
	"plan" text,
	"discount" numeric(5, 2) DEFAULT '0',
	"mrr" numeric(10, 2) DEFAULT '0' NOT NULL,
	"one_time_revenue" numeric(10, 2) DEFAULT '0' NOT NULL,
	"annual_run_rate" numeric(10, 2) DEFAULT '0' NOT NULL,
	"onboarding_date" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_snapshots" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "monthly_snapshots_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"month" text NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "monthly_snapshots_month_unique" UNIQUE("month")
);
--> statement-breakpoint
CREATE TABLE "receivables" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"month" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatif_scenarios" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"modified_per_seat_price" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
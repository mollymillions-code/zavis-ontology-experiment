CREATE TABLE "monthly_costs" (
	"id" text PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"category" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"type" text DEFAULT 'actual' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

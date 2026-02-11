CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"s3_key" text NOT NULL,
	"document_type" text DEFAULT 'contract' NOT NULL,
	"extraction_data" jsonb,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);

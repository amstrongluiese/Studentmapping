CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"target_value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text DEFAULT 'api' NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"imported_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "mapping_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"import_id" integer,
	"action" text NOT NULL,
	"school_registry_id" integer,
	"student_processed_id" integer,
	"message" text NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"department_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"track" text,
	"level" text DEFAULT 'Bachelor' NOT NULL,
	"color" text NOT NULL,
	"target_value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "programs_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" integer,
	"referred_name" text NOT NULL,
	"relationship" text NOT NULL,
	"contact_number" text,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_registry_id" integer NOT NULL,
	"alias_name" text NOT NULL,
	"normalized_alias" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "school_aliases_normalized_alias_unique" UNIQUE("normalized_alias")
);
--> statement-breakpoint
CREATE TABLE "school_match_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"imported_name" text NOT NULL,
	"official_school_id" integer,
	"resolved_by" text DEFAULT 'Admin' NOT NULL,
	"occurrences" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" text,
	"school_name" text NOT NULL,
	"normalized_school_name" text DEFAULT '' NOT NULL,
	"school_type" text,
	"sector" text,
	"municipality" text DEFAULT 'Laguna' NOT NULL,
	"province" text DEFAULT 'Laguna' NOT NULL,
	"barangay" text,
	"address" text,
	"latitude" double precision,
	"longitude" double precision,
	"source" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_number" text NOT NULL,
	"full_name" text NOT NULL,
	"previous_school" text,
	"strand" text,
	"admission_type" text,
	"program" text,
	"scholarship" text,
	"municipality" text DEFAULT 'Laguna' NOT NULL,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	"import_source" text NOT NULL,
	"import_status" text DEFAULT 'Pending' NOT NULL,
	"matched_school_id" integer,
	"match_confidence" integer,
	"match_rule" text,
	"enrollment_status" text DEFAULT 'Unknown' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_number" text NOT NULL,
	"name" text NOT NULL,
	"referral_code" text NOT NULL,
	CONSTRAINT "students_student_number_unique" UNIQUE("student_number"),
	CONSTRAINT "students_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "students_processed" (
	"id" serial PRIMARY KEY NOT NULL,
	"raw_id" integer,
	"student_number" text NOT NULL,
	"full_name" text NOT NULL,
	"course" text,
	"strand" text,
	"admission_type" text,
	"last_school_name" text NOT NULL,
	"previous_school" text,
	"contact_number" text,
	"schedule" text,
	"iskolar_ni_kap" text,
	"requirements" text,
	"last_school_type" text,
	"school_registry_id" integer,
	"municipality" text DEFAULT 'Laguna' NOT NULL,
	"province" text DEFAULT 'Laguna' NOT NULL,
	"year_level" text,
	"enrollment_status" text DEFAULT 'Active' NOT NULL,
	"enrollment_date" timestamp DEFAULT now() NOT NULL,
	"imported_source" text DEFAULT 'API' NOT NULL,
	"archived_at" timestamp,
	"mapping_status" text DEFAULT 'pending' NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students_raw" (
	"id" serial PRIMARY KEY NOT NULL,
	"import_id" integer,
	"student_number" text NOT NULL,
	"full_name" text NOT NULL,
	"course" text,
	"strand" text,
	"last_school_name" text NOT NULL,
	"last_school_type" text,
	"student_type" text,
	"municipality" text DEFAULT 'Laguna' NOT NULL,
	"province" text DEFAULT 'Laguna' NOT NULL,
	"previous_school" text,
	"contact_number" text,
	"schedule" text,
	"iskolar_ni_kap" text,
	"requirements" text,
	"year_level" text,
	"raw_payload" text,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mapping_logs" ADD CONSTRAINT "mapping_logs_import_id_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mapping_logs" ADD CONSTRAINT "mapping_logs_school_registry_id_school_registry_id_fk" FOREIGN KEY ("school_registry_id") REFERENCES "public"."school_registry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mapping_logs" ADD CONSTRAINT "mapping_logs_student_processed_id_students_processed_id_fk" FOREIGN KEY ("student_processed_id") REFERENCES "public"."students_processed"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_students_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_aliases" ADD CONSTRAINT "school_aliases_school_registry_id_school_registry_id_fk" FOREIGN KEY ("school_registry_id") REFERENCES "public"."school_registry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_match_history" ADD CONSTRAINT "school_match_history_official_school_id_school_registry_id_fk" FOREIGN KEY ("official_school_id") REFERENCES "public"."school_registry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_imports" ADD CONSTRAINT "student_imports_matched_school_id_school_registry_id_fk" FOREIGN KEY ("matched_school_id") REFERENCES "public"."school_registry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students_processed" ADD CONSTRAINT "students_processed_raw_id_students_raw_id_fk" FOREIGN KEY ("raw_id") REFERENCES "public"."students_raw"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students_processed" ADD CONSTRAINT "students_processed_school_registry_id_school_registry_id_fk" FOREIGN KEY ("school_registry_id") REFERENCES "public"."school_registry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students_raw" ADD CONSTRAINT "students_raw_import_id_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."imports"("id") ON DELETE no action ON UPDATE no action;
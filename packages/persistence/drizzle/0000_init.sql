CREATE TABLE "approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"rule_version_id" text NOT NULL,
	"approver_name" text NOT NULL,
	"approver_title" text NOT NULL,
	"decision" text NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"rule_hash" text NOT NULL,
	"decided_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifacts" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"rule_version_id" text NOT NULL,
	"target" text NOT NULL,
	"files_json" jsonb NOT NULL,
	"pr_title" text NOT NULL,
	"pr_body" text NOT NULL,
	"pr_url" text,
	"branch" text,
	"export_status" text DEFAULT 'generated' NOT NULL,
	"merge_status" text DEFAULT 'unknown' NOT NULL,
	"confirmed_by" text,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"object_type" text NOT NULL,
	"object_id" text NOT NULL,
	"details_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_items" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"incident_id" text NOT NULL,
	"name" text NOT NULL,
	"bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"storage_key" text,
	"sensitivity" text DEFAULT 'internal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facts" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"incident_id" text NOT NULL,
	"status" text NOT NULL,
	"text" text NOT NULL,
	"cites_json" jsonb NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"incident_key" text NOT NULL,
	"title" text NOT NULL,
	"workflow" text NOT NULL,
	"parser" text NOT NULL,
	"synthetic" boolean DEFAULT false NOT NULL,
	"impact_type" text DEFAULT 'unauthorized_commitment' NOT NULL,
	"impact_amount" integer,
	"currency" text,
	"status" text DEFAULT 'analyzed' NOT NULL,
	"facts_json" jsonb NOT NULL,
	"execution_json" jsonb NOT NULL,
	"explanation_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loophole_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"rule_version_id" text NOT NULL,
	"case_key" text NOT NULL,
	"name" text NOT NULL,
	"literal" text NOT NULL,
	"intent" text NOT NULL,
	"status" text NOT NULL,
	"recommendation" text,
	"case_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_calls" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"incident_id" text,
	"purpose" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"input_sha256" text NOT NULL,
	"output_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rule_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"rule_id" text NOT NULL,
	"version" integer NOT NULL,
	"rule_hash" text NOT NULL,
	"rule_json" jsonb NOT NULL,
	"plain_language" text NOT NULL,
	"kind" text NOT NULL,
	"supersedes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"rule_key" text NOT NULL,
	"workflow" text NOT NULL,
	"shape" text DEFAULT 'threshold_approval' NOT NULL,
	"source_incident_id" text NOT NULL,
	"current_version_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"owner_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_suites" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"rule_version_id" text NOT NULL,
	"engine" text DEFAULT 'everrule-evaluator' NOT NULL,
	"passed" integer NOT NULL,
	"total" integer NOT NULL,
	"results_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "approvals_version_idx" ON "approvals" USING btree ("rule_version_id");--> statement-breakpoint
CREATE INDEX "artifacts_version_idx" ON "artifacts" USING btree ("rule_version_id");--> statement-breakpoint
CREATE INDEX "audit_org_idx" ON "audit_log" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "evidence_incident_idx" ON "evidence_items" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "facts_incident_idx" ON "facts" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "incidents_org_idx" ON "incidents" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "loophole_runs_version_idx" ON "loophole_runs" USING btree ("rule_version_id");--> statement-breakpoint
CREATE INDEX "memberships_org_idx" ON "memberships" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "model_calls_org_idx" ON "model_calls" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "rule_versions_rule_idx" ON "rule_versions" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "rules_org_idx" ON "rules" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "test_suites_version_idx" ON "test_suites" USING btree ("rule_version_id");
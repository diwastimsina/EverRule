import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * V1 Core persistence. Every business table carries org_id and every query goes
 * through src/db/repo.ts, which scopes by it. Nothing is deleted; rows are
 * superseded or retired. Timestamps are UTC.
 */

const id = (name = "id") => text(name).primaryKey();
const orgRef = () => text("org_id").notNull();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: createdAt(),
});

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: createdAt(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    orgId: orgRef(),
    userId: text("user_id").notNull(),
    role: text("role").notNull(), // operator | owner | sponsor | viewer
    createdAt: createdAt(),
  },
  (t) => [index("memberships_org_idx").on(t.orgId)],
);

export const incidents = pgTable(
  "incidents",
  {
    id: id(),
    orgId: orgRef(),
    incidentKey: text("incident_key").notNull(), // e.g. INC-482
    title: text("title").notNull(),
    workflow: text("workflow").notNull(),
    parser: text("parser").notNull(),
    synthetic: boolean("synthetic").notNull().default(false),
    impactType: text("impact_type").notNull().default("unauthorized_commitment"),
    impactAmount: integer("impact_amount"),
    currency: text("currency"),
    status: text("status").notNull().default("analyzed"),
    factsJson: jsonb("facts_json").notNull(), // evaluator Facts
    executionJson: jsonb("execution_json").notNull(),
    explanationJson: jsonb("explanation_json"),
    createdAt: createdAt(),
  },
  (t) => [index("incidents_org_idx").on(t.orgId)],
);

export const evidenceItems = pgTable(
  "evidence_items",
  {
    id: id(),
    orgId: orgRef(),
    incidentId: text("incident_id").notNull(),
    name: text("name").notNull(),
    bytes: integer("bytes").notNull(),
    sha256: text("sha256").notNull(),
    storageKey: text("storage_key"),
    sensitivity: text("sensitivity").notNull().default("internal"),
    createdAt: createdAt(),
  },
  (t) => [index("evidence_incident_idx").on(t.incidentId)],
);

export const facts = pgTable(
  "facts",
  {
    id: id(),
    orgId: orgRef(),
    incidentId: text("incident_id").notNull(),
    status: text("status").notNull(), // confirmed | not_verified
    text: text("text").notNull(),
    citesJson: jsonb("cites_json").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [index("facts_incident_idx").on(t.incidentId)],
);

export const rules = pgTable(
  "rules",
  {
    id: id(),
    orgId: orgRef(),
    ruleKey: text("rule_key").notNull(),
    workflow: text("workflow").notNull(),
    shape: text("shape").notNull().default("threshold_approval"),
    sourceIncidentId: text("source_incident_id").notNull(),
    currentVersionId: text("current_version_id"),
    status: text("status").notNull().default("draft"), // draft | approved | exported | merged | confirmed | drifted | retired
    ownerName: text("owner_name"),
    createdAt: createdAt(),
  },
  (t) => [index("rules_org_idx").on(t.orgId)],
);

export const ruleVersions = pgTable(
  "rule_versions",
  {
    id: id(),
    orgId: orgRef(),
    ruleId: text("rule_id").notNull(),
    version: integer("version").notNull(),
    ruleHash: text("rule_hash").notNull(),
    ruleJson: jsonb("rule_json").notNull(),
    plainLanguage: text("plain_language").notNull(),
    kind: text("kind").notNull(), // initial | improved | edited
    supersedes: text("supersedes"),
    createdAt: createdAt(),
  },
  (t) => [index("rule_versions_rule_idx").on(t.ruleId)],
);

export const approvals = pgTable(
  "approvals",
  {
    id: id(),
    orgId: orgRef(),
    ruleVersionId: text("rule_version_id").notNull(),
    approverName: text("approver_name").notNull(),
    approverTitle: text("approver_title").notNull(),
    decision: text("decision").notNull(),
    rationale: text("rationale").notNull().default(""),
    ruleHash: text("rule_hash").notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("approvals_version_idx").on(t.ruleVersionId)],
);

export const loopholeRuns = pgTable(
  "loophole_runs",
  {
    id: id(),
    orgId: orgRef(),
    ruleVersionId: text("rule_version_id").notNull(),
    caseKey: text("case_key").notNull(),
    name: text("name").notNull(),
    literal: text("literal").notNull(),
    intent: text("intent").notNull(),
    status: text("status").notNull(), // holds | loophole | owner_decides
    recommendation: text("recommendation"),
    caseJson: jsonb("case_json").notNull(),
    runAt: createdAt(),
  },
  (t) => [index("loophole_runs_version_idx").on(t.ruleVersionId)],
);

export const testSuites = pgTable(
  "test_suites",
  {
    id: id(),
    orgId: orgRef(),
    ruleVersionId: text("rule_version_id").notNull(),
    engine: text("engine").notNull().default("everrule-evaluator"),
    passed: integer("passed").notNull(),
    total: integer("total").notNull(),
    resultsJson: jsonb("results_json").notNull(),
    runAt: createdAt(),
  },
  (t) => [index("test_suites_version_idx").on(t.ruleVersionId)],
);

export const artifacts = pgTable(
  "artifacts",
  {
    id: id(),
    orgId: orgRef(),
    ruleVersionId: text("rule_version_id").notNull(),
    target: text("target").notNull(), // typescript | rego | patch
    filesJson: jsonb("files_json").notNull(),
    prTitle: text("pr_title").notNull(),
    prBody: text("pr_body").notNull(),
    prUrl: text("pr_url"),
    branch: text("branch"),
    exportStatus: text("export_status").notNull().default("generated"), // generated | sent
    mergeStatus: text("merge_status").notNull().default("unknown"), // unknown | merged | closed
    confirmedBy: text("confirmed_by"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("artifacts_version_idx").on(t.ruleVersionId)],
);

export const modelCalls = pgTable(
  "model_calls",
  {
    id: id(),
    orgId: orgRef(),
    incidentId: text("incident_id"),
    purpose: text("purpose").notNull(),
    provider: text("provider").notNull(), // demo | anthropic
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    inputSha256: text("input_sha256").notNull(),
    outputJson: jsonb("output_json").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("model_calls_org_idx").on(t.orgId)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    orgId: orgRef(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    objectType: text("object_type").notNull(),
    objectId: text("object_id").notNull(),
    detailsJson: jsonb("details_json"),
    at: createdAt(),
  },
  (t) => [index("audit_org_idx").on(t.orgId)],
);

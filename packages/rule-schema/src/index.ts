// Zod schemas shared by the demo. They are the contract between the evidence
// parser, the model, the deterministic engine and the UI.
// Schema validity is not business validity.
import { z } from "zod";

export const FactStatus = z.enum(["confirmed", "not_confirmed", "not_verifiable"]);
export type FactStatus = z.infer<typeof FactStatus>;

export const Currency = z.enum(["USD", "EUR"]);
export type Currency = z.infer<typeof Currency>;

// ---------- evidence ----------

export const EvidenceFile = z.object({ name: z.string().max(200), content: z.string().max(1_000_000) });
export type EvidenceFile = z.infer<typeof EvidenceFile>;

export const IncidentInput = z.object({
  description: z.string().min(1).max(2000),
  impact_amount: z.number().nullable(),
  files: z.array(EvidenceFile).min(1).max(10),
});
export type IncidentInput = z.infer<typeof IncidentInput>;

export const EvidenceFileRecord = z.object({ name: z.string(), sha256: z.string().regex(/^[0-9a-f]{64}$/), bytes: z.number().int().nonnegative() });
export type EvidenceFileRecord = z.infer<typeof EvidenceFileRecord>;

/** What happened to the business. Rules attach here. */
export const Effect = z.object({
  type: z.literal("financial_commitment_created"),
  resource: z.literal("purchase_order"),
  action: z.literal("create"),
  commitment_id: z.string(),
  vendor_id: z.string(),
  amount: z.number(),
  currency: Currency,
  occurred_at: z.string().nullable(),
  source: z.string(),
});
export type Effect = z.infer<typeof Effect>;

/** How the agent got there. Recorded for the report; the evaluator never reads it. */
export const Execution = z.object({
  actor_type: z.enum(["ai_agent", "human", "automation", "unknown"]),
  agent_id: z.string().nullable(),
  model: z.string().nullable(),
  path: z.enum(["tool_call", "generated_script", "browser_automation", "api", "unknown"]),
  tool_name: z.string().nullable(),
  trace_id: z.string().nullable(),
  source: z.string().nullable(),
});
export type Execution = z.infer<typeof Execution>;

export const TimelineItem = z.object({
  time: z.string().nullable(),
  actor: z.string(),
  action: z.string(),
  evidence: z.array(z.string()),
  status: FactStatus,
});
export type TimelineItem = z.infer<typeof TimelineItem>;

export const ImpactCategory = z.enum(["unauthorized_exposure", "realized_loss", "remediation_cost", "customer_credits", "operational_cost"]);
export type ImpactCategory = z.infer<typeof ImpactCategory>;

export const ImpactLine = z.object({ category: ImpactCategory, amount: z.number().nullable(), status: FactStatus, note: z.string().nullable() });
export type ImpactLine = z.infer<typeof ImpactLine>;

export const IncidentAnalysis = z.object({
  incident_id: z.string(),
  title: z.string(),
  summary: z.string(),
  effect: Effect,
  execution: Execution,
  files: z.array(EvidenceFileRecord),
  timeline: z.array(TimelineItem),
  impact: z.array(ImpactLine),
  missing_evidence: z.array(z.string()),
});
export type IncidentAnalysis = z.infer<typeof IncidentAnalysis>;

// ---------- rules ----------

export const ApprovalRequirements = z.object({
  role: z.literal("director"),
  check_role: z.boolean(),
  must_be_valid: z.boolean(),
  scoped_to_vendor: z.boolean(),
  must_reference_commitment: z.boolean(),
  must_precede_request: z.boolean(),
  must_not_be_expired: z.boolean(),
  single_use: z.boolean(),
  no_self_approval: z.boolean(),
  cap_covers_commitment: z.boolean(),
  currency_must_match: z.boolean(),
});
export type ApprovalRequirements = z.infer<typeof ApprovalRequirements>;

export const RuleParams = z.object({
  threshold: z.number().positive(),
  operator: z.enum(["gt", "gte"]),
  currency: z.literal("USD"),
  aggregate: z.object({ by: z.literal("vendor"), window_hours: z.number().positive() }).nullable(),
  approval: ApprovalRequirements,
});
export type RuleParams = z.infer<typeof RuleParams>;

export const CandidateRule = z.object({
  rule_id: z.string().regex(/^ER-[A-Z]+-\d{3}$/),
  version: z.number().int().positive(),
  plain_english: z.string(),
  effect: z.object({ resource: z.string(), action: z.string() }),
  params: RuleParams,
  evidence_citations: z.array(z.string()),
  assumptions: z.array(z.string()),
  missing_evidence: z.array(z.string()),
});
export type CandidateRule = z.infer<typeof CandidateRule>;

// ---------- scenarios, loopholes, tests ----------

export const ApprovalEvidence = z.object({
  approval_id: z.string(),
  approver_id: z.string(),
  approver_role: z.enum(["director", "manager", "analyst"]),
  vendor_id: z.string(),
  amount_cap: z.number(),
  currency: Currency,
  valid: z.boolean(),
  references_commitment: z.string().nullable(),
  issued_hours_before_request: z.number(),
  expires_hours_after_request: z.number(),
});
export type ApprovalEvidence = z.infer<typeof ApprovalEvidence>;

export const Scenario = z.object({
  prior_orders: z.array(z.object({ vendor_id: z.string(), amount: z.number(), hours_before: z.number() })),
  request: z.object({
    commitment_id: z.string(),
    requester_id: z.string(),
    vendor_id: z.string(),
    amount: z.number().nullable(),
    currency: Currency,
    approval: ApprovalEvidence.nullable(),
  }),
  used_approval_ids: z.array(z.string()),
});
export type Scenario = z.infer<typeof Scenario>;

export const LoopholeCategory = z.enum([
  "boundary", "split_aggregate", "stale_evidence", "timing_reversal", "wrong_identity",
  "wrong_scope", "replay_reuse", "invalid_evidence", "alternate_currency",
]);
export type LoopholeCategory = z.infer<typeof LoopholeCategory>;

export const Intent = z.enum(["allow", "deny", "owner_decides"]);
export type Intent = z.infer<typeof Intent>;

export const Loophole = z.object({
  id: z.string(),
  category: LoopholeCategory,
  title: z.string(),
  explanation: z.string(),
  intent: Intent,
  recommendation: z.string(),
  scenario: Scenario,
});
export type Loophole = z.infer<typeof Loophole>;

export const Decision = z.object({ allowed: z.boolean(), reason: z.string() });
export type Decision = z.infer<typeof Decision>;

/** holds: the literal decision matches intent. loophole: it does not. owner_decides: the wording is ambiguous. */
export const Classification = z.enum(["holds", "loophole", "owner_decides"]);
export type Classification = z.infer<typeof Classification>;

export const LoopholeCheck = z.object({
  loophole: Loophole,
  initial: Decision,
  improved: Decision,
  initial_class: Classification,
  improved_class: Classification,
  real: z.boolean(),
  closed: z.boolean(),
});
export type LoopholeCheck = z.infer<typeof LoopholeCheck>;

/** What the approver submits. The server binds it to the rule hash. */
export const ApprovalInput = z.object({
  approver_name: z.string().min(1),
  approver_role: z.string().min(1),
  approved_at: z.string(),
  rationale: z.string(),
  edited: z.boolean(),
});
export type ApprovalInput = z.infer<typeof ApprovalInput>;

export const ApprovalRecord = ApprovalInput.extend({
  decision: z.literal("approved"),
  rule_hash: z.string().regex(/^[0-9a-f]{64}$/),
});
export type ApprovalRecord = z.infer<typeof ApprovalRecord>;

export const TestCategory = z.enum(["incident", "boundary", "approval", "aggregate", "missing_evidence"]);
export type TestCategory = z.infer<typeof TestCategory>;

export const TestCase = z.object({ id: z.string(), category: TestCategory, name: z.string(), scenario: Scenario, expect: z.enum(["allow", "deny"]) });
export type TestCase = z.infer<typeof TestCase>;

export const TestResult = z.object({ test: TestCase, passed: z.boolean(), reason: z.string() });
export type TestResult = z.infer<typeof TestResult>;

export const GeneratedFile = z.object({ path: z.string(), content: z.string() });
export type GeneratedFile = z.infer<typeof GeneratedFile>;

export const ProtectionArtifact = z.object({
  rule: CandidateRule,
  rule_hash: z.string(),
  approval: ApprovalRecord,
  files: z.array(GeneratedFile),
  patch: z.string(),
  pr_title: z.string(),
  pr_body: z.string(),
});
export type ProtectionArtifact = z.infer<typeof ProtectionArtifact>;

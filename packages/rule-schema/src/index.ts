// Zod schemas shared by the demo. These are the contract between the LLM,
// the deterministic engine, and the UI. Schema validity is not business validity.
import { z } from "zod";

export const FactStatus = z.enum(["confirmed", "not_confirmed", "not_verifiable"]);
export type FactStatus = z.infer<typeof FactStatus>;

export const EvidenceFile = z.object({ name: z.string(), content: z.string() });
export type EvidenceFile = z.infer<typeof EvidenceFile>;

export const IncidentInput = z.object({
  description: z.string().min(1),
  impact_amount: z.number().nullable(),
  files: z.array(EvidenceFile).min(1),
});
export type IncidentInput = z.infer<typeof IncidentInput>;

export const TimelineItem = z.object({
  time: z.string().nullable(),
  actor: z.string(),
  action: z.string(),
  evidence: z.array(z.string()),
  status: FactStatus,
});
export type TimelineItem = z.infer<typeof TimelineItem>;

export const ImpactCategory = z.enum([
  "unauthorized_exposure",
  "realized_loss",
  "remediation_cost",
  "customer_credits",
  "operational_cost",
]);
export type ImpactCategory = z.infer<typeof ImpactCategory>;

export const ImpactLine = z.object({
  category: ImpactCategory,
  amount: z.number().nullable(),
  status: FactStatus,
  note: z.string().nullable(),
});
export type ImpactLine = z.infer<typeof ImpactLine>;

export const IncidentAnalysis = z.object({
  incident_id: z.string(),
  title: z.string(),
  summary: z.string(),
  vendor_id: z.string(),
  amount: z.number(),
  timeline: z.array(TimelineItem),
  impact: z.array(ImpactLine),
  missing_evidence: z.array(z.string()),
});
export type IncidentAnalysis = z.infer<typeof IncidentAnalysis>;

export const ApprovalRequirements = z.object({
  role: z.literal("director"),
  check_role: z.boolean(),
  scoped_to_vendor: z.boolean(),
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
  currency: z.literal("USD"),
  aggregate: z.object({ by: z.literal("vendor"), window_hours: z.number().positive() }).nullable(),
  approval: ApprovalRequirements,
});
export type RuleParams = z.infer<typeof RuleParams>;

export const CandidateRule = z.object({
  rule_id: z.string(),
  version: z.number().int().positive(),
  plain_english: z.string(),
  effect: z.object({ resource: z.string(), action: z.string() }),
  params: RuleParams,
  evidence_citations: z.array(z.string()),
  assumptions: z.array(z.string()),
  missing_evidence: z.array(z.string()),
});
export type CandidateRule = z.infer<typeof CandidateRule>;

export const ApprovalEvidence = z.object({
  approval_id: z.string(),
  approver_id: z.string(),
  approver_role: z.enum(["director", "manager", "analyst"]),
  vendor_id: z.string(),
  amount_cap: z.number(),
  currency: z.enum(["USD", "EUR"]),
  issued_hours_before_request: z.number(),
  expires_hours_after_request: z.number(),
});
export type ApprovalEvidence = z.infer<typeof ApprovalEvidence>;

export const Scenario = z.object({
  prior_orders: z.array(z.object({ vendor_id: z.string(), amount: z.number(), hours_before: z.number() })),
  request: z.object({
    requester_id: z.string(),
    vendor_id: z.string(),
    amount: z.number().nullable(),
    currency: z.enum(["USD", "EUR"]),
    approval: ApprovalEvidence.nullable(),
  }),
  used_approval_ids: z.array(z.string()),
});
export type Scenario = z.infer<typeof Scenario>;

export const LoopholeCategory = z.enum([
  "split_aggregate",
  "wrong_scope",
  "wrong_identity",
  "stale_evidence",
  "timing_reversal",
  "replay_reuse",
  "boundary",
  "alternate_currency",
]);
export type LoopholeCategory = z.infer<typeof LoopholeCategory>;

export const Loophole = z.object({
  id: z.string(),
  category: LoopholeCategory,
  title: z.string(),
  explanation: z.string(),
  scenario: Scenario,
});
export type Loophole = z.infer<typeof Loophole>;

export const Decision = z.object({ allowed: z.boolean(), reason: z.string() });
export type Decision = z.infer<typeof Decision>;

export const LoopholeCheck = z.object({
  loophole: Loophole,
  initial: Decision,
  improved: Decision,
  real: z.boolean(),
  closed: z.boolean(),
});
export type LoopholeCheck = z.infer<typeof LoopholeCheck>;

export const ApprovalRecord = z.object({
  approver_name: z.string().min(1),
  approver_role: z.string().min(1),
  approved_at: z.string(),
  rationale: z.string(),
  edited: z.boolean(),
});
export type ApprovalRecord = z.infer<typeof ApprovalRecord>;

export const TestCategory = z.enum(["incident", "legitimate", "prohibited", "boundary", "loophole", "missing_evidence"]);
export type TestCategory = z.infer<typeof TestCategory>;

export const TestCase = z.object({
  id: z.string(),
  category: TestCategory,
  name: z.string(),
  scenario: Scenario,
  expect: z.enum(["allow", "deny"]),
});
export type TestCase = z.infer<typeof TestCase>;

export const TestResult = z.object({ test: TestCase, passed: z.boolean(), reason: z.string() });
export type TestResult = z.infer<typeof TestResult>;

export const GeneratedFile = z.object({ path: z.string(), content: z.string() });
export type GeneratedFile = z.infer<typeof GeneratedFile>;

export const ProtectionArtifact = z.object({
  rule: CandidateRule,
  approval: ApprovalRecord,
  files: z.array(GeneratedFile),
  patch: z.string(),
  pr_title: z.string(),
  pr_body: z.string(),
});
export type ProtectionArtifact = z.infer<typeof ProtectionArtifact>;

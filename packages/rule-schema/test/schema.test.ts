import { test } from "node:test";
import assert from "node:assert/strict";
import { ApprovalRecord, CandidateRule, Execution, Scenario } from "../src/index";

const approval = { role: "director", check_role: true, must_be_valid: true, scoped_to_vendor: true, must_reference_commitment: true, must_precede_request: true, must_not_be_expired: true, single_use: true, no_self_approval: true, cap_covers_commitment: true, currency_must_match: true } as const;

test("a candidate rule with a negative threshold is rejected", () => {
  const r = CandidateRule.safeParse({ rule_id: "ER-PROC-019", version: 1, plain_english: "x", effect: { resource: "purchase_order", action: "create" }, params: { threshold: -1, operator: "gt", currency: "USD", aggregate: null, approval }, evidence_citations: [], assumptions: [], missing_evidence: [] });
  assert.equal(r.success, false);
});

test("a rule id outside the ER-XXX-000 pattern is rejected", () => {
  const r = CandidateRule.safeParse({ rule_id: "rule-1", version: 1, plain_english: "x", effect: { resource: "purchase_order", action: "create" }, params: { threshold: 1, operator: "gt", currency: "USD", aggregate: null, approval }, evidence_citations: [], assumptions: [], missing_evidence: [] });
  assert.equal(r.success, false);
});

test("a scenario may carry a null amount to represent missing evidence", () => {
  const s = Scenario.parse({ prior_orders: [], request: { commitment_id: "PO-1", requester_id: "a", vendor_id: "v", amount: null, currency: "USD", approval: null }, used_approval_ids: [] });
  assert.equal(s.request.amount, null);
});

test("an approval record must carry a 64-character rule hash", () => {
  const base = { approver_name: "J", approver_role: "Director", approved_at: "2026-09-29T00:00:00Z", rationale: "", edited: false, decision: "approved" };
  assert.equal(ApprovalRecord.safeParse({ ...base, rule_hash: "abc" }).success, false);
  assert.equal(ApprovalRecord.safeParse({ ...base, rule_hash: "a".repeat(64) }).success, true);
});

test("execution context has no field the evaluator could mistake for the effect", () => {
  const keys = Object.keys(Execution.shape).sort();
  assert.deepEqual(keys, ["actor_type", "agent_id", "model", "path", "source", "tool_name", "trace_id"]);
});

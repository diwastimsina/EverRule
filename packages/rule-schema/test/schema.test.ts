import { test } from "node:test";
import assert from "node:assert/strict";
import { CandidateRule, Scenario } from "../src/index";

test("a candidate rule with a negative threshold is rejected", () => {
  const r = CandidateRule.safeParse({
    rule_id: "X", version: 1, plain_english: "x", effect: { resource: "purchase_order", action: "create" },
    params: { threshold: -1, currency: "USD", aggregate: null, approval: {
      role: "director", check_role: false, scoped_to_vendor: false, must_precede_request: false, must_not_be_expired: false,
      single_use: false, no_self_approval: false, cap_covers_commitment: false, currency_must_match: false } },
    evidence_citations: [], assumptions: [], missing_evidence: [],
  });
  assert.equal(r.success, false);
});

test("a scenario may carry a null amount to represent missing evidence", () => {
  const s = Scenario.parse({ prior_orders: [], request: { requester_id: "a", vendor_id: "v", amount: null, currency: "USD", approval: null }, used_approval_ids: [] });
  assert.equal(s.request.amount, null);
});

// Builds and runs the deterministic test matrix for an approved rule.
// Categories required by the PRD: incident, legitimate, prohibited, boundary,
// accepted loopholes, missing evidence.
import type { CandidateRule, LoopholeCheck, Scenario, TestCase, TestResult } from "@everrule/rule-schema";
import { evaluate } from "@everrule/loophole-engine";

const VENDOR = "VEND-2291";

function plain(amount: number | null, prior: Scenario["prior_orders"] = []): Scenario {
  return {
    prior_orders: prior,
    request: { requester_id: "procurement-agent", vendor_id: VENDOR, amount, currency: "USD", approval: null },
    used_approval_ids: [],
  };
}

export function buildMatrix(rule: CandidateRule, incidentAmount: number, accepted: LoopholeCheck[]): TestCase[] {
  const t = rule.params.threshold;
  const window = rule.params.aggregate?.window_hours ?? 24;
  const cases: TestCase[] = [
    { id: "T-INC", category: "incident", name: `the recorded incident: $${incidentAmount.toLocaleString()} with no approval`, scenario: plain(incidentAmount), expect: "deny" },
    { id: "T-LEG-1", category: "legitimate", name: "$12,000 with no approval", scenario: plain(12_000), expect: "allow" },
    {
      id: "T-LEG-2", category: "legitimate", name: `$${incidentAmount.toLocaleString()} with a valid director approval`,
      scenario: { ...plain(incidentAmount), request: { ...plain(incidentAmount).request, approval: {
        approval_id: "APR-2001", approver_id: "dir-ellis", approver_role: "director", vendor_id: VENDOR,
        amount_cap: incidentAmount + 2_000, currency: "USD", issued_hours_before_request: 2, expires_hours_after_request: 72 } } },
      expect: "allow",
    },
    { id: "T-PRO", category: "prohibited", name: `$${(t + 28_000).toLocaleString()} with no approval`, scenario: plain(t + 28_000), expect: "deny" },
    { id: "T-BND-1", category: "boundary", name: `exactly $${t.toLocaleString()} needs no approval`, scenario: plain(t), expect: "allow" },
    { id: "T-BND-2", category: "boundary", name: `$${t.toLocaleString()} plus one cent needs approval`, scenario: plain(t + 0.01), expect: "deny" },
    { id: "T-BND-3", category: "boundary", name: `a prior order older than ${window}h does not count`, scenario: plain(40_000, [{ vendor_id: VENDOR, amount: 40_000, hours_before: window + 1 }]), expect: "allow" },
    { id: "T-BND-4", category: "boundary", name: `$30,000 then $20,000 then $1 within ${window}h is denied`, scenario: plain(1, [{ vendor_id: VENDOR, amount: 30_000, hours_before: 2 }, { vendor_id: VENDOR, amount: 20_000, hours_before: 1 }]), expect: "deny" },
    { id: "T-MIS", category: "missing_evidence", name: "absent amount is denied, not allowed", scenario: plain(null), expect: "deny" },
  ];
  for (const c of accepted) {
    cases.push({ id: `T-${c.loophole.id}`, category: "loophole", name: c.loophole.title, scenario: c.loophole.scenario, expect: "deny" });
  }
  return cases;
}

export function runMatrix(rule: CandidateRule, cases: TestCase[]): TestResult[] {
  return cases.map((test) => {
    const d = evaluate(rule.params, test.scenario);
    const passed = (test.expect === "allow") === d.allowed;
    return { test, passed, reason: d.reason };
  });
}

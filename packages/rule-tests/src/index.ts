// The deterministic test matrix for an approved threshold-plus-approval rule.
// Expected outcomes come from `oracle`, written in plain terms from the owner's
// intent, not from the evaluator. That is what makes a passing run mean something
// when the same cases run against the customer's own guard.
import type { ApprovalEvidence, CandidateRule, Scenario, TestCase, TestResult } from "@everrule/rule-schema";
import { evaluate } from "@everrule/loophole-engine";

const VENDOR = "VEND-2291";
const REQUESTER = "procurement-agent";

/** What the owner means, for this rule shape. Independent of `evaluate`. */
export function oracle(rule: CandidateRule, s: Scenario): "allow" | "deny" {
  const r = s.request;
  const T = rule.params.threshold;
  if (r.amount === null || !(r.amount > 0)) return "deny";
  if (r.currency !== rule.params.currency) return "deny";
  let total = r.amount;
  const w = rule.params.aggregate?.window_hours;
  if (w !== undefined) {
    for (const o of s.prior_orders) if (o.vendor_id === r.vendor_id && o.hours_before >= 0 && o.hours_before < w) total += o.amount;
  }
  const needsApproval = rule.params.operator === "gte" ? total >= T : total > T;
  if (!needsApproval) return "allow";
  const a = r.approval;
  if (!a) return "deny";
  const good =
    a.valid &&
    a.approver_role === "director" &&
    a.approver_id !== r.requester_id &&
    a.vendor_id === r.vendor_id &&
    a.currency === r.currency &&
    a.amount_cap >= total &&
    a.issued_hours_before_request >= 0 &&
    a.expires_hours_after_request > 0 &&
    (a.references_commitment === null || a.references_commitment === r.commitment_id) &&
    !s.used_approval_ids.includes(a.approval_id);
  return good ? "allow" : "deny";
}

function approval(id: string, commitment: string, amount: number, over: Partial<ApprovalEvidence> = {}): ApprovalEvidence {
  return {
    approval_id: id, approver_id: "dir-ellis", approver_role: "director", vendor_id: VENDOR,
    amount_cap: Math.max(amount, 100_000) * 2, currency: "USD", valid: true, references_commitment: commitment,
    issued_hours_before_request: 2, expires_hours_after_request: 72, ...over,
  };
}

function req(id: string, amount: number | null, a: ApprovalEvidence | null, prior: Scenario["prior_orders"] = [], used: string[] = []): Scenario {
  return { prior_orders: prior, used_approval_ids: used, request: { commitment_id: id, requester_id: REQUESTER, vendor_id: VENDOR, amount, currency: "USD", approval: a } };
}

const money = (n: number) => `$${n.toLocaleString()}`;

/** Sixteen cases: four amounts with and without approval, five bad approvals, two aggregates, the incident. */
export function buildMatrix(rule: CandidateRule, incidentAmount: number): TestCase[] {
  const T = rule.params.threshold;
  const w = rule.params.aggregate?.window_hours ?? 24;
  const half = Math.round((T * 0.8) / 1000) * 1000;
  const cases: Omit<TestCase, "expect">[] = [];
  const amounts: [string, number][] = [["T-1", T - 1], ["T", T], ["T+1", T + 1], ["10T", 10 * T]];
  amounts.forEach(([label, amt], i) => {
    cases.push({ id: `T-${String(i * 2 + 1).padStart(2, "0")}`, category: label === "T+1" ? "missing_evidence" : "boundary", name: `${money(amt)} (${label}) with no approval`, scenario: req(`PO-T${i * 2 + 1}`, amt, null) });
    cases.push({ id: `T-${String(i * 2 + 2).padStart(2, "0")}`, category: "boundary", name: `${money(amt)} (${label}) with a valid director approval`, scenario: req(`PO-T${i * 2 + 2}`, amt, approval(`APR-T${i * 2 + 2}`, `PO-T${i * 2 + 2}`, amt)) });
  });
  const o = T + 1;
  const bad: [string, Partial<ApprovalEvidence>, string[]][] = [
    ["an expired approval", { expires_hours_after_request: -1 / 3600 }, []],
    ["a manager's approval", { approver_role: "manager" }, []],
    ["the requester's own approval", { approver_id: REQUESTER }, []],
    ["an invalid approval", { valid: false }, []],
    ["an approval already used", {}, ["APR-T-REUSED"]],
  ];
  bad.forEach(([what, over, used], i) => {
    const id = `PO-A${i + 1}`;
    const apr = approval(used.length ? "APR-T-REUSED" : `APR-A${i + 1}`, id, o, over);
    cases.push({ id: `T-${String(9 + i).padStart(2, "0")}`, category: "approval", name: `${money(o)} with ${what}`, scenario: req(id, o, apr, [], used) });
  });
  cases.push({ id: "T-14", category: "aggregate", name: `${money(half)} after ${money(half)} to the same vendor 3h earlier, no approval`, scenario: req("PO-G1", half, null, [{ vendor_id: VENDOR, amount: half, hours_before: 3 }]) });
  cases.push({ id: "T-15", category: "aggregate", name: `${money(half)} after ${money(half)} to the same vendor ${w + 1}h earlier, no approval`, scenario: req("PO-G2", half, null, [{ vendor_id: VENDOR, amount: half, hours_before: w + 1 }]) });
  cases.push({ id: "T-16", category: "incident", name: `the recorded incident: ${money(incidentAmount)} with no approval`, scenario: req("PO-88219", incidentAmount, null) });
  return cases.map((c) => ({ ...c, expect: oracle(rule, c.scenario) }));
}

export function runMatrix(rule: CandidateRule, cases: TestCase[]): TestResult[] {
  return cases.map((test) => {
    const d = evaluate(rule.params, test.scenario);
    return { test, passed: (test.expect === "allow") === d.allowed, reason: d.reason };
  });
}

// Thirteen fixed cases for threshold-plus-approval rules, instantiated from the
// rule's own threshold. Each carries the owner's intent. The evaluator decides
// what the literal rule does; classification compares that with the intent.
import type { ApprovalEvidence, CandidateRule, Classification, Decision, Intent, Loophole, LoopholeCheck, Scenario } from "@everrule/rule-schema";
import { evaluate } from "./evaluate";

const VENDOR = "VEND-2291";
const REQUESTER = "procurement-agent";
const ORDER = "PO-CASE-1";
const SECOND = 1 / 3600;

function approval(amount: number, over: Partial<ApprovalEvidence> = {}): ApprovalEvidence {
  return {
    approval_id: "APR-1001", approver_id: "dir-ellis", approver_role: "director", vendor_id: VENDOR,
    amount_cap: Math.max(amount, 100_000), currency: "USD", valid: true, references_commitment: ORDER,
    issued_hours_before_request: 2, expires_hours_after_request: 72, ...over,
  };
}

function scenario(amount: number | null, a: ApprovalEvidence | null, extra: Partial<Scenario> = {}, currency: "USD" | "EUR" = "USD"): Scenario {
  return {
    prior_orders: [],
    used_approval_ids: [],
    ...extra,
    request: { commitment_id: ORDER, requester_id: REQUESTER, vendor_id: VENDOR, amount, currency, approval: a },
  };
}

const money = (n: number) => `$${n.toLocaleString()}`;

export function standardLoopholes(rule: CandidateRule): Loophole[] {
  const t = rule.params.threshold;
  const over = t + 1;
  const half = Math.round((t * 0.8) / 1000) * 1000;
  const L = (id: number, category: Loophole["category"], title: string, explanation: string, intent: Intent, recommendation: string, s: Scenario): Loophole =>
    ({ id: `LH-${String(id).padStart(2, "0")}`, category, title, explanation, intent, recommendation, scenario: s });
  return [
    L(1, "boundary", `Just under the threshold: ${money(t - 1)}, no approval`, "Below the line the rule should not apply.", "allow", "None.", scenario(t - 1, null)),
    L(2, "boundary", `Exactly at the threshold: ${money(t)}, no approval`, `The rule says "above". An order of exactly ${money(t)} passes without approval. Is that what you meant?`, "owner_decides", `Keep "above", or change to "at or above" ${money(t)}.`, scenario(t, null)),
    L(3, "boundary", `Just over the threshold: ${money(over)}, no approval`, "The first dollar over the line must need approval.", "deny", "None.", scenario(over, null)),
    L(4, "split_aggregate", `Two ${money(half)} orders to the same vendor, 3 hours apart`, `Each order is under ${money(t)}, so a single-order rule never fires. Together they commit ${money(2 * half)} to one vendor.`, "deny", "Count the vendor's commitments in a rolling 24-hour window, not one order at a time.", scenario(half, null, { prior_orders: [{ vendor_id: VENDOR, amount: half, hours_before: 3 }] })),
    L(5, "stale_evidence", "Approval expired one second before the order", "A real director approval, but it lapsed just before execution.", "deny", "Check expiry at execution time.", scenario(over, approval(over, { expires_hours_after_request: -SECOND }))),
    L(6, "timing_reversal", "Approval issued after the order", "The approval is attached one hour after the order was placed.", "deny", "Require the approval to exist before execution.", scenario(over, approval(over, { issued_hours_before_request: -1 }))),
    L(7, "wrong_identity", "Approver is a manager, not a director", "The approval is real but from the wrong role.", "deny", "Check the approver's role.", scenario(over, approval(over, { approver_role: "manager" }))),
    L(8, "wrong_identity", "Requester approves their own order", "The agent's own identity appears as the approver.", "deny", "Reject approvals where approver and requester match.", scenario(over, approval(over, { approver_id: REQUESTER }))),
    L(9, "wrong_scope", "Approval is for a different order", "A valid director approval exists, but it names PO-CASE-9.", "deny", "Require the approval to reference this order.", scenario(over, approval(over, { references_commitment: "PO-CASE-9" }))),
    L(10, "replay_reuse", "Same approval reused for a second order", "One valid approval is attached to two orders.", "deny", "Make approvals single-use.", scenario(over, approval(over), { used_approval_ids: ["APR-1001"] })),
    L(11, "invalid_evidence", "Approval record marked invalid", "The approval system flags the record as revoked or malformed.", "deny", "Require a valid approval record.", scenario(over, approval(over, { valid: false }))),
    L(12, "alternate_currency", `EUR ${over.toLocaleString()} with no USD conversion record`, "A dollar threshold compared against a euro amount without conversion.", "deny", "Refuse commitments the rule cannot evaluate.", scenario(over, approval(over, { currency: "EUR" }), {}, "EUR")),
    L(13, "boundary", `Ten times the threshold: ${money(10 * t)}, no approval`, "A large order with no approval must be refused.", "deny", "None.", scenario(10 * t, null)),
  ];
}

export function classify(intent: Intent, d: Decision): Classification {
  if (intent === "owner_decides") return "owner_decides";
  return (intent === "allow") === d.allowed ? "holds" : "loophole";
}

/** Real: the initial rule gets it wrong. Closed: the improved rule does not. */
export function checkLoopholes(initial: CandidateRule, improved: CandidateRule, loopholes: Loophole[]): LoopholeCheck[] {
  return loopholes.map((loophole) => {
    const i = evaluate(initial.params, loophole.scenario);
    const m = evaluate(improved.params, loophole.scenario);
    const initial_class = classify(loophole.intent, i);
    const improved_class = classify(loophole.intent, m);
    return { loophole, initial: i, improved: m, initial_class, improved_class, real: initial_class === "loophole", closed: improved_class !== "loophole" };
  });
}

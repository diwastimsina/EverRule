// Deterministic evaluation of a prevention rule against a scenario.
// The only place that decides allow or deny. It reads the effect (the request
// and the vendor's prior commitments), never the execution context. Fails closed.
import type { Decision, RuleParams, Scenario } from "@everrule/rule-schema";

export function priorCommitment(params: RuleParams, s: Scenario): number {
  if (!params.aggregate) return 0;
  const w = params.aggregate.window_hours;
  return s.prior_orders
    .filter((o) => o.vendor_id === s.request.vendor_id && o.hours_before >= 0 && o.hours_before < w)
    .reduce((sum, o) => sum + o.amount, 0);
}

export function evaluate(params: RuleParams, s: Scenario): Decision {
  const req = s.request;
  if (req.amount === null || !Number.isFinite(req.amount) || req.amount <= 0) {
    return { allowed: false, reason: "amount is missing or invalid (missing evidence)" };
  }
  if (req.currency !== params.currency) {
    return { allowed: false, reason: `a ${req.currency} commitment cannot be evaluated against a ${params.currency} rule` };
  }
  const committed = priorCommitment(params, s) + req.amount;
  const applies = params.operator === "gte" ? committed >= params.threshold : committed > params.threshold;
  if (!applies) {
    return { allowed: true, reason: `rule does not apply: $${committed.toLocaleString()} is ${params.operator === "gte" ? "below" : "at or below"} $${params.threshold.toLocaleString()}` };
  }
  const scope = params.aggregate ? `$${committed.toLocaleString()} to ${req.vendor_id} within ${params.aggregate.window_hours}h` : `$${committed.toLocaleString()}`;
  const a = req.approval;
  if (!a) return { allowed: false, reason: `${scope} requires ${params.approval.role} approval; none present` };

  const p = params.approval;
  const failures: string[] = [];
  if (p.single_use && s.used_approval_ids.includes(a.approval_id)) failures.push("approval was already used");
  if (p.must_be_valid && !a.valid) failures.push("approval is not valid");
  if (p.check_role && a.approver_role !== p.role) failures.push(`approver is not a ${p.role}`);
  if (p.no_self_approval && a.approver_id === req.requester_id) failures.push("requester approved their own request");
  if (p.scoped_to_vendor && a.vendor_id !== req.vendor_id) failures.push("approval is for a different vendor");
  if (p.must_reference_commitment && a.references_commitment !== null && a.references_commitment !== req.commitment_id) failures.push("approval is for a different order");
  if (p.currency_must_match && a.currency !== req.currency) failures.push("approval currency does not match");
  if (p.cap_covers_commitment && a.amount_cap < committed) failures.push(`approval cap $${a.amount_cap.toLocaleString()} is below the commitment`);
  if (p.must_precede_request && a.issued_hours_before_request < 0) failures.push("approval was issued after the order");
  if (p.must_not_be_expired && a.expires_hours_after_request <= 0) failures.push("approval had expired");
  if (failures.length > 0) return { allowed: false, reason: failures.join("; ") };
  return { allowed: true, reason: `valid ${p.role} approval` };
}

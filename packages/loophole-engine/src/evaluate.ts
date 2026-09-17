// Deterministic evaluation of a parametrized prevention rule against a scenario.
// This is the only place that decides allow or deny. The LLM never decides.
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
  const id = "rule";
  if (req.amount === null || !Number.isFinite(req.amount) || req.amount <= 0) {
    return { allowed: false, reason: `${id}: amount is missing or invalid (missing evidence)` };
  }
  if (params.approval.currency_must_match && req.currency !== params.currency) {
    return { allowed: false, reason: `${id}: non-${params.currency} commitment needs a conversion record (missing evidence)` };
  }
  const committed = priorCommitment(params, s) + req.amount;
  if (committed <= params.threshold) {
    return { allowed: true, reason: `${id}: commitment $${committed} is at or below $${params.threshold}` };
  }
  const scope = params.aggregate ? `aggregate $${committed} to ${req.vendor_id} within ${params.aggregate.window_hours}h` : `$${committed}`;
  const a = req.approval;
  if (!a) return { allowed: false, reason: `${id}: ${scope} requires ${params.approval.role} approval` };

  const p = params.approval;
  if (p.single_use && s.used_approval_ids.includes(a.approval_id)) return { allowed: false, reason: `${id}: approval was already used` };
  if (p.check_role && a.approver_role !== p.role) return { allowed: false, reason: `${id}: approver is not a ${p.role}` };
  if (p.no_self_approval && a.approver_id === req.requester_id) return { allowed: false, reason: `${id}: requester approved their own request` };
  if (p.scoped_to_vendor && a.vendor_id !== req.vendor_id) return { allowed: false, reason: `${id}: approval is for a different vendor` };
  if (p.currency_must_match && a.currency !== req.currency) return { allowed: false, reason: `${id}: approval currency does not match` };
  if (p.cap_covers_commitment && a.amount_cap < committed) return { allowed: false, reason: `${id}: approval cap $${a.amount_cap} is below the commitment $${committed}` };
  if (p.must_precede_request && a.issued_hours_before_request < 0) return { allowed: false, reason: `${id}: approval was issued after the request` };
  if (p.must_not_be_expired && a.expires_hours_after_request <= 0) return { allowed: false, reason: `${id}: approval has expired` };
  return { allowed: true, reason: `${id}: valid ${p.role} approval` };
}

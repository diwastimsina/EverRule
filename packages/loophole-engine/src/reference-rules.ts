// The first-draft rule for the procurement incident and the split-transaction fix.
import type { CandidateRule } from "@everrule/rule-schema";

export function naiveRule(threshold = 50_000): CandidateRule {
  return {
    rule_id: "ER-PROC-019",
    version: 1,
    plain_english: `A purchase order above $${threshold.toLocaleString()} requires a valid director approval for that order, issued before it and used once.`,
    effect: { resource: "purchase_order", action: "create" },
    params: {
      threshold,
      operator: "gt",
      currency: "USD",
      aggregate: null,
      approval: {
        role: "director", check_role: true, must_be_valid: true, scoped_to_vendor: true, must_reference_commitment: true,
        must_precede_request: true, must_not_be_expired: true, single_use: true, no_self_approval: true,
        cap_covers_commitment: true, currency_must_match: true,
      },
    },
    evidence_citations: ["agent-log.json", "procurement-audit.csv"],
    assumptions: [`$${threshold.toLocaleString()} is the existing director-approval threshold`],
    missing_evidence: ["the agent's prompt or policy text at the time of the incident"],
  };
}

/** Rewrites the trigger onto the vendor's rolling commitment and bumps the version. */
export function closeSplitTransaction(rule: CandidateRule, windowHours = 24): CandidateRule {
  const t = rule.params.threshold;
  const word = rule.params.operator === "gte" ? "at or above" : "above";
  return {
    ...rule,
    version: rule.version + 1,
    plain_english: `Commitments to the same vendor totaling ${word} $${t.toLocaleString()} within ${windowHours} hours require a valid director approval for that order, issued before it and used once. Missing evidence means refuse.`,
    params: { ...rule.params, aggregate: { by: "vendor", window_hours: windowHours } },
    assumptions: [...rule.assumptions, `${windowHours} hours is the aggregation window chosen by the business owner`],
  };
}

export function improvedRule(threshold = 50_000, windowHours = 24): CandidateRule {
  return closeSplitTransaction(naiveRule(threshold), windowHours);
}

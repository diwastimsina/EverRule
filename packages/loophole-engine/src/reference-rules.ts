// The two reference rules for the procurement incident. The LLM may propose
// these in its own words; the parameters are what the engine evaluates.
import type { CandidateRule } from "@everrule/rule-schema";

export function naiveRule(threshold = 50_000): CandidateRule {
  return {
    rule_id: "ER-PROC-019",
    version: 1,
    plain_english: `Purchases above $${threshold.toLocaleString()} require director approval.`,
    effect: { resource: "purchase_order", action: "create" },
    params: {
      threshold,
      currency: "USD",
      aggregate: null,
      approval: {
        role: "director",
        check_role: false,
        scoped_to_vendor: false,
        must_precede_request: false,
        must_not_be_expired: false,
        single_use: false,
        no_self_approval: false,
        cap_covers_commitment: false,
        currency_must_match: false,
      },
    },
    evidence_citations: ["EV-01", "EV-02"],
    assumptions: [`$${threshold.toLocaleString()} is the existing director-approval threshold`],
    missing_evidence: ["the agent's prompt or policy text at the time of the incident"],
  };
}

export function improvedRule(threshold = 50_000, windowHours = 24): CandidateRule {
  const base = naiveRule(threshold);
  return {
    ...base,
    version: 2,
    plain_english: `Aggregate commitments to the same vendor above $${threshold.toLocaleString()} within ${windowHours} hours require a valid director approval scoped to that vendor and commitment. Missing evidence means refuse.`,
    params: {
      threshold,
      currency: "USD",
      aggregate: { by: "vendor", window_hours: windowHours },
      approval: {
        role: "director",
        check_role: true,
        scoped_to_vendor: true,
        must_precede_request: true,
        must_not_be_expired: true,
        single_use: true,
        no_self_approval: true,
        cap_covers_commitment: true,
        currency_must_match: true,
      },
    },
    assumptions: [...base.assumptions, `${windowHours} hours is the aggregation window chosen by the business owner`],
  };
}

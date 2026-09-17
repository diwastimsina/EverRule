// The fixed loophole taxonomy, instantiated against a rule's threshold and vendor.
// Each case is a concrete scenario. Whether it is a real loophole is decided by
// evaluating it, never by asserting it.
import type { ApprovalEvidence, CandidateRule, Loophole, LoopholeCheck, Scenario } from "@everrule/rule-schema";
import { evaluate } from "./evaluate";

const VENDOR = "VEND-2291";
const REQUESTER = "procurement-agent";

function validApproval(over: Partial<ApprovalEvidence> = {}): ApprovalEvidence {
  return {
    approval_id: "APR-1001",
    approver_id: "dir-ellis",
    approver_role: "director",
    vendor_id: VENDOR,
    amount_cap: 80_000,
    currency: "USD",
    issued_hours_before_request: 2,
    expires_hours_after_request: 72,
    ...over,
  };
}

function scenario(over: Partial<Scenario["request"]> = {}, prior: Scenario["prior_orders"] = [], used: string[] = []): Scenario {
  return {
    prior_orders: prior,
    request: { requester_id: REQUESTER, vendor_id: VENDOR, amount: 78_000, currency: "USD", approval: null, ...over },
    used_approval_ids: used,
  };
}

export function standardLoopholes(rule: CandidateRule): Loophole[] {
  const t = rule.params.threshold;
  const split = Math.round((t * 0.8) / 1000) * 1000; // two orders each under the threshold
  const over = t + 28_000;
  return [
    {
      id: "LH-1", category: "split_aggregate",
      title: `Two $${split.toLocaleString()} orders to the same vendor, 3 hours apart`,
      explanation: `Each order is under $${t.toLocaleString()}, so a single-order rule never fires. Together they commit $${(2 * split).toLocaleString()} to one vendor.`,
      scenario: scenario({ amount: split }, [{ vendor_id: VENDOR, amount: split, hours_before: 3 }]),
    },
    {
      id: "LH-2", category: "wrong_scope",
      title: "Approval names a different vendor",
      explanation: "An approval exists, but for VEND-0007. A rule that only checks for the presence of an approval accepts it.",
      scenario: scenario({ amount: over, approval: validApproval({ vendor_id: "VEND-0007" }) }),
    },
    {
      id: "LH-3", category: "wrong_identity",
      title: "Approver is a manager, not a director",
      explanation: "The approval is real but from the wrong role.",
      scenario: scenario({ amount: over, approval: validApproval({ approver_role: "manager" }) }),
    },
    {
      id: "LH-4", category: "wrong_identity",
      title: "Requester approves their own request",
      explanation: "The agent's own identity appears as the approver.",
      scenario: scenario({ amount: over, approval: validApproval({ approver_id: REQUESTER }) }),
    },
    {
      id: "LH-5", category: "stale_evidence",
      title: "Approval expired before the request",
      explanation: "A director approval from last quarter is presented for this order.",
      scenario: scenario({ amount: over, approval: validApproval({ expires_hours_after_request: -1 }) }),
    },
    {
      id: "LH-6", category: "timing_reversal",
      title: "Approval issued after the purchase order",
      explanation: "The approval is attached retroactively, one hour after the order was placed.",
      scenario: scenario({ amount: over, approval: validApproval({ issued_hours_before_request: -1 }) }),
    },
    {
      id: "LH-7", category: "replay_reuse",
      title: "Same approval reused for a second order",
      explanation: "One valid approval is attached to two orders.",
      scenario: scenario({ amount: over, approval: validApproval() }, [], ["APR-1001"]),
    },
    {
      id: "LH-8", category: "boundary",
      title: "Approval cap is below the commitment",
      explanation: `A director approved up to $60,000. The order is $${over.toLocaleString()}.`,
      scenario: scenario({ amount: over, approval: validApproval({ amount_cap: 60_000 }) }),
    },
    {
      id: "LH-9", category: "alternate_currency",
      title: "EUR 70,000 with no USD conversion record",
      explanation: "A dollar threshold compared against a euro amount without conversion.",
      scenario: scenario({ amount: 70_000, currency: "EUR", approval: validApproval({ currency: "EUR" }) }),
    },
  ];
}

/** A loophole is real when the initial rule allows it, and closed when the improved rule denies it. */
export function checkLoopholes(initial: CandidateRule, improved: CandidateRule, loopholes: Loophole[]): LoopholeCheck[] {
  return loopholes.map((loophole) => {
    const i = evaluate(initial.params, loophole.scenario);
    const m = evaluate(improved.params, loophole.scenario);
    return { loophole, initial: i, improved: m, real: i.allowed, closed: !m.allowed };
  });
}

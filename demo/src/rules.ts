// SYNTHETIC reference demo.
// Two versions of the prevention rule for INC-482.
//   v1: the obvious rule. A single PO above $50,000 needs an approval.
//   v2: the owner-approved rule after the loophole check (ER-PROC-019).
// Rules are pure functions over the request plus the vendor's recent commitments.

import type { Approval, Decision, PurchaseOrder, PurchaseOrderRequest } from "./types.js";

export const THRESHOLD_USD = 50_000;
export const WINDOW_MS = 24 * 60 * 60 * 1000;

const ms = (iso: string) => new Date(iso).getTime();

export function ruleV1(req: PurchaseOrderRequest): Decision {
  if (req.amount > THRESHOLD_USD && !req.approval) {
    return { allowed: false, reason: "ER-PROC-019 v1: PO above $50,000 requires approval" };
  }
  return { allowed: true, reason: "ER-PROC-019 v1: no approval required or approval present" };
}

/** Sum of prior commitments to the same vendor inside the rolling window. */
export function priorCommitment(req: PurchaseOrderRequest, ledger: readonly PurchaseOrder[]): number {
  const now = ms(req.requested_at);
  return ledger
    .filter((po) => po.vendor_id === req.vendor_id)
    .filter((po) => now - ms(po.created_at) < WINDOW_MS && now - ms(po.created_at) >= 0)
    .reduce((sum, po) => sum + po.amount, 0);
}

function approvalProblem(req: PurchaseOrderRequest, a: Approval, committed: number, used: ReadonlySet<string>): string | null {
  if (used.has(a.approval_id)) return "approval was already used";
  if (a.approver_role !== "director") return "approver is not a director";
  if (a.approver_id === req.requester_id) return "requester approved their own request";
  if (a.vendor_id !== req.vendor_id) return "approval is for a different vendor";
  if (a.currency !== req.currency) return "approval currency does not match request";
  if (a.amount_cap < committed) return "approval cap is below the aggregate commitment";
  if (ms(a.issued_at) > ms(req.requested_at)) return "approval was issued after the request";
  if (ms(a.expires_at) <= ms(req.requested_at)) return "approval has expired";
  return null;
}

export function ruleV2(
  req: PurchaseOrderRequest,
  ledger: readonly PurchaseOrder[],
  usedApprovals: ReadonlySet<string>,
): Decision {
  // Missing required evidence is a deny, not a pass.
  if (req.currency !== "USD") {
    return { allowed: false, reason: "ER-PROC-019: non-USD commitment needs a USD conversion record (missing evidence)" };
  }
  if (!Number.isFinite(req.amount) || req.amount <= 0) {
    return { allowed: false, reason: "ER-PROC-019: amount is missing or invalid (missing evidence)" };
  }

  const committed = priorCommitment(req, ledger) + req.amount;
  if (committed <= THRESHOLD_USD) {
    return { allowed: true, reason: `ER-PROC-019: aggregate $${committed} within 24h is at or below $${THRESHOLD_USD}` };
  }
  if (!req.approval) {
    return { allowed: false, reason: `ER-PROC-019: aggregate $${committed} to ${req.vendor_id} within 24h requires director approval` };
  }
  const problem = approvalProblem(req, req.approval, committed, usedApprovals);
  if (problem) {
    return { allowed: false, reason: `ER-PROC-019: ${problem}` };
  }
  return { allowed: true, reason: "ER-PROC-019: valid director approval scoped to vendor and commitment" };
}

// SYNTHETIC reference demo. A tiny procurement service that owns the effect.
// The guard for ER-PROC-019 lives here, in the customer's own code path.

import { ruleV2 } from "./rules.js";
import type { PurchaseOrder, PurchaseOrderRequest } from "./types.js";

export class RuleViolation extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "RuleViolation";
  }
}

export class PurchaseOrderService {
  private orders: PurchaseOrder[] = [];
  private usedApprovals = new Set<string>();
  private seq = 88218;

  createPurchaseOrder(req: PurchaseOrderRequest): PurchaseOrder {
    const decision = ruleV2(req, this.orders, this.usedApprovals);
    if (!decision.allowed) throw new RuleViolation(decision.reason);

    this.seq += 1;
    const po: PurchaseOrder = {
      ...req,
      po_id: `PO-${this.seq}`,
      created_at: req.requested_at,
    };
    this.orders.push(po);
    if (req.approval) this.usedApprovals.add(req.approval.approval_id);
    return po;
  }

  list(): readonly PurchaseOrder[] {
    return this.orders;
  }
}

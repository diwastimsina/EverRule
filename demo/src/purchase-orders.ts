// SYNTHETIC reference demo. A tiny procurement service that owns the effect.

import type { PurchaseOrder, PurchaseOrderRequest } from "./types.js";

export class PurchaseOrderService {
  private orders: PurchaseOrder[] = [];
  private seq = 88218;

  createPurchaseOrder(req: PurchaseOrderRequest): PurchaseOrder {
    this.seq += 1;
    const po: PurchaseOrder = {
      ...req,
      po_id: `PO-${this.seq}`,
      created_at: req.requested_at,
    };
    this.orders.push(po);
    return po;
  }

  list(): readonly PurchaseOrder[] {
    return this.orders;
  }
}

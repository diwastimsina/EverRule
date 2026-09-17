// SYNTHETIC reference demo. Replays the recorded incident through the service.
// Prints whether the prohibited purchase order gets created.

import { readFileSync } from "node:fs";
import { PurchaseOrderService } from "./purchase-orders.js";
import type { PurchaseOrderRequest } from "./types.js";

const fixture = JSON.parse(readFileSync(new URL("../fixtures/incident-482.json", import.meta.url), "utf8"));
const record = fixture.evidence[0].records[0];
const req = record.input as PurchaseOrderRequest;

const service = new PurchaseOrderService();
try {
  const po = service.createPurchaseOrder(req);
  console.log(`INCIDENT REPRODUCED: ${po.po_id} created for $${po.amount} to ${po.vendor_id} with no approval.`);
} catch (err) {
  console.log(`BLOCKED: ${(err as Error).message}`);
}

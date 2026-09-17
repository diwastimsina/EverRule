// SYNTHETIC reference demo. The recorded incident, replayed as a regression test.
// On the pre-control commit this test FAILS (the PO is created). After the guard it passes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PurchaseOrderService } from "../src/purchase-orders.js";
import type { PurchaseOrderRequest } from "../src/types.js";

const fixture = JSON.parse(readFileSync(new URL("../fixtures/incident-482.json", import.meta.url), "utf8"));
const incidentRequest = fixture.evidence[0].records[0].input as PurchaseOrderRequest;

test("INC-482: a $78,000 PO with no approval is refused", () => {
  const service = new PurchaseOrderService();
  assert.throws(() => service.createPurchaseOrder(incidentRequest), /approval/i);
  assert.equal(service.list().length, 0);
});

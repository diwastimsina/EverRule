// After the EverRule patch (ER-PROC-019 v2), INC-482 no longer goes through. Regression test for the original incident.
import { test } from "node:test";
import assert from "node:assert/strict";
import { procurementApi } from "./procurement-api";
import { createPurchaseOrder } from "./purchase-orders";
import { PolicyViolation } from "./procurement-policy";

test("INC-482: a $78,000 order with no approval is refused", async () => {
  procurementApi.__reset();
  await assert.rejects(
    createPurchaseOrder({ commitment_id: "PO-88219", requester_id: "procurement-agent", vendor_id: "VEND-2291", amount: 78_000, currency: "USD", requested_at: "2026-08-17T14:02:11Z" }),
    PolicyViolation,
  );
});

// SYNTHETIC reference demo.
// Each case satisfies the literal v1 rule while violating the business intent.
// v1 must ALLOW it (the loophole is real). v2 must DENY it (the loophole is closed).

import { test } from "node:test";
import assert from "node:assert/strict";
import { ruleV1, ruleV2 } from "../src/rules.js";
import type { PurchaseOrder, PurchaseOrderRequest } from "../src/types.js";
import { approval, at, request } from "./helpers.js";

interface Loophole {
  category: string;
  name: string;
  req: PurchaseOrderRequest;
  ledger?: PurchaseOrder[];
  used?: string[];
}

const priorPo = (amount: number, hoursAgo: number): PurchaseOrder => ({
  ...request({ amount, requested_at: at(-hoursAgo) }),
  po_id: "PO-PRIOR",
  created_at: at(-hoursAgo),
});

export const LOOPHOLES: Loophole[] = [
  { category: "split / aggregate", name: "two $40,000 orders to the same vendor 3 hours apart",
    req: request({ amount: 40_000 }), ledger: [priorPo(40_000, 3)] },
  { category: "wrong scope", name: "approval is for a different vendor",
    req: request({ approval: approval({ vendor_id: "VEND-0007" }) }) },
  { category: "wrong identity", name: "approver is a manager, not a director",
    req: request({ approval: approval({ approver_role: "manager" }) }) },
  { category: "wrong identity", name: "requester approves their own request",
    req: request({ approval: approval({ approver_id: "procurement-agent" }) }) },
  { category: "stale evidence", name: "approval expired before the request",
    req: request({ approval: approval({ expires_at: at(-1) }) }) },
  { category: "timing reversal", name: "approval issued after the purchase order",
    req: request({ approval: approval({ issued_at: at(+1) }) }) },
  { category: "replay / reuse", name: "same approval used for a second order",
    req: request({ approval: approval() }), used: ["APR-1001"] },
  { category: "boundary", name: "approval cap below the commitment",
    req: request({ approval: approval({ amount_cap: 60_000 }) }) },
  { category: "alternate currency", name: "EUR 70,000 with no USD conversion record",
    req: request({ amount: 70_000, currency: "EUR", approval: approval({ currency: "EUR" }) }) },
];

for (const lh of LOOPHOLES) {
  test(`[${lh.category}] ${lh.name}: v1 allows, v2 denies`, () => {
    const v1 = ruleV1(lh.req);
    const v2 = ruleV2(lh.req, lh.ledger ?? [], new Set(lh.used ?? []));
    assert.equal(v1.allowed, true, `v1 should be fooled: ${v1.reason}`);
    assert.equal(v2.allowed, false, `v2 should deny: ${v2.reason}`);
  });
}

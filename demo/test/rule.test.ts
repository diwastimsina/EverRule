// SYNTHETIC reference demo. Deterministic tests for ER-PROC-019 v2.
// Categories required by the PRD: legitimate, prohibited, boundary, missing evidence.

import { test } from "node:test";
import assert from "node:assert/strict";
import { PurchaseOrderService, RuleViolation } from "../src/purchase-orders.js";
import { ruleV2, THRESHOLD_USD } from "../src/rules.js";
import { approval, at, request } from "./helpers.js";

test("legitimate: $12,000 to a vendor with no approval is allowed", () => {
  assert.equal(ruleV2(request({ amount: 12_000 }), [], new Set()).allowed, true);
});

test("legitimate: $78,000 with a valid director approval is allowed", () => {
  assert.equal(ruleV2(request({ approval: approval() }), [], new Set()).allowed, true);
});

test("prohibited: $78,000 with no approval is denied", () => {
  const d = ruleV2(request(), [], new Set());
  assert.equal(d.allowed, false);
  assert.match(d.reason, /director approval/);
});

test("boundary: exactly $50,000 needs no approval", () => {
  assert.equal(ruleV2(request({ amount: THRESHOLD_USD }), [], new Set()).allowed, true);
});

test("boundary: $50,000.01 needs approval", () => {
  assert.equal(ruleV2(request({ amount: THRESHOLD_USD + 0.01 }), [], new Set()).allowed, false);
});

test("boundary: $30,000 then $20,000 within 24h is allowed, then $1 more is denied", () => {
  const s = new PurchaseOrderService();
  s.createPurchaseOrder(request({ amount: 30_000, requested_at: at(0) }));
  s.createPurchaseOrder(request({ amount: 20_000, requested_at: at(1) }));
  assert.throws(() => s.createPurchaseOrder(request({ amount: 1, requested_at: at(2) })), RuleViolation);
});

test("boundary: a prior order older than 24h does not count", () => {
  const s = new PurchaseOrderService();
  s.createPurchaseOrder(request({ amount: 40_000, requested_at: at(-25) }));
  assert.doesNotThrow(() => s.createPurchaseOrder(request({ amount: 40_000, requested_at: at(0) })));
});

test("missing evidence: absent amount is denied, not allowed", () => {
  const d = ruleV2(request({ amount: Number.NaN }), [], new Set());
  assert.equal(d.allowed, false);
  assert.match(d.reason, /missing evidence/);
});

test("service: an approval is consumed after one use", () => {
  const s = new PurchaseOrderService();
  s.createPurchaseOrder(request({ approval: approval() }));
  assert.throws(
    () => s.createPurchaseOrder(request({ requested_at: at(1), approval: approval() })),
    /already used/,
  );
});

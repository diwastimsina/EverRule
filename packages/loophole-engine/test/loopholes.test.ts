import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLoopholes, evaluate, improvedRule, naiveRule, standardLoopholes } from "../src/index";

const v1 = naiveRule();
const v2 = improvedRule();

test("every standard loophole is real against v1 and closed by v2", () => {
  const checks = checkLoopholes(v1, v2, standardLoopholes(v1));
  assert.equal(checks.length, 9);
  for (const c of checks) {
    assert.equal(c.real, true, `${c.loophole.id} should fool v1: ${c.initial.reason}`);
    assert.equal(c.closed, true, `${c.loophole.id} should be denied by v2: ${c.improved.reason}`);
  }
});

test("the recorded incident is denied by both rules", () => {
  const s = standardLoopholes(v1)[1].scenario; // $78K, then strip the approval
  const incident = { ...s, request: { ...s.request, amount: 78_000, approval: null } };
  assert.equal(evaluate(v1.params, incident).allowed, false);
  assert.equal(evaluate(v2.params, incident).allowed, false);
});

test("exactly the threshold needs no approval; one cent more does", () => {
  const base = standardLoopholes(v1)[1].scenario;
  const at = { ...base, request: { ...base.request, amount: 50_000, approval: null } };
  const over = { ...base, request: { ...base.request, amount: 50_000.01, approval: null } };
  assert.equal(evaluate(v2.params, at).allowed, true);
  assert.equal(evaluate(v2.params, over).allowed, false);
});

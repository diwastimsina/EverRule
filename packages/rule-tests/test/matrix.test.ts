import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLoopholes, improvedRule, naiveRule, standardLoopholes } from "@everrule/loophole-engine";
import { buildMatrix, runMatrix } from "../src/index";

test("the full matrix passes against the improved rule", () => {
  const v1 = naiveRule(); const v2 = improvedRule();
  const checks = checkLoopholes(v1, v2, standardLoopholes(v1));
  const results = runMatrix(v2, buildMatrix(v2, 78_000, checks));
  assert.equal(results.length, 18);
  const failed = results.filter((r) => !r.passed);
  assert.deepEqual(failed.map((r) => `${r.test.id}: ${r.reason}`), []);
});

test("the naive rule fails the loophole rows of the same matrix", () => {
  const v1 = naiveRule(); const v2 = improvedRule();
  const checks = checkLoopholes(v1, v2, standardLoopholes(v1));
  const results = runMatrix(v1, buildMatrix(v2, 78_000, checks));
  const failedLoopholes = results.filter((r) => r.test.category === "loophole" && !r.passed);
  assert.equal(failedLoopholes.length, 9);
});

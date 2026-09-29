import { test } from "node:test";
import assert from "node:assert/strict";
import { improvedRule, naiveRule } from "@everrule/loophole-engine";
import { buildMatrix, oracle, runMatrix } from "../src/index";

test("sixteen cases, all passing against the approved rule", () => {
  const v2 = improvedRule();
  const results = runMatrix(v2, buildMatrix(v2, 78_000));
  assert.equal(results.length, 16);
  assert.deepEqual(results.filter((r) => !r.passed).map((r) => `${r.test.id}: ${r.reason}`), []);
});

test("the split case in the matrix fails against the first draft", () => {
  const v1 = naiveRule(), v2 = improvedRule();
  const failed = runMatrix(v1, buildMatrix(v2, 78_000)).filter((r) => !r.passed).map((r) => r.test.id);
  assert.deepEqual(failed, ["T-14"]);
});

test("the incident is denied and the outside-window split is allowed", () => {
  const v2 = improvedRule();
  const m = buildMatrix(v2, 78_000);
  assert.equal(m.find((c) => c.id === "T-16")!.expect, "deny");
  assert.equal(m.find((c) => c.id === "T-15")!.expect, "allow");
});

test("the oracle follows the operator the owner chose", () => {
  const v2 = improvedRule();
  const at = buildMatrix(v2, 78_000).find((c) => c.id === "T-03")!;
  assert.equal(oracle(v2, at.scenario), "allow");
  assert.equal(oracle({ ...v2, params: { ...v2.params, operator: "gte" } }, at.scenario), "deny");
});

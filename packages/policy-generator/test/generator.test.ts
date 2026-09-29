import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLoopholes, improvedRule, naiveRule, ruleHash, standardLoopholes } from "@everrule/loophole-engine";
import { buildMatrix, runMatrix } from "@everrule/rule-tests";
import { generateProtection } from "../src/index";

const v1 = naiveRule(), v2 = improvedRule();
const approval = { approver_name: "J. Ellis", approver_role: "Director of Procurement Operations", approved_at: "2026-09-16T00:00:00Z", rationale: "test", edited: false, decision: "approved" as const, rule_hash: ruleHash(v2) };
const checks = checkLoopholes(v1, v2, standardLoopholes(v1));
const results = runMatrix(v2, buildMatrix(v2, 78_000));
const a = generateProtection(v2, approval, checks, results, "INC-482", 78_000);

test("the artifact carries five files and a patch touching all of them", () => {
  assert.deepEqual(a.files.map((f) => f.path), ["src/purchase-orders.ts", "src/procurement-policy.ts", "src/procurement-policy.test.ts", "everrule/ER-PROC-019.json", "src/purchase-orders.test.ts"]);
  for (const f of a.files) assert.ok(a.patch.includes(`+++ b/${f.path}`), f.path);
});

test("the guard encodes every requirement, the window, and the concurrency note", () => {
  const policy = a.files[1]!.content;
  for (const needle of ["already used", "is not valid", "not a director", "own request", "different vendor", "different order", "currency does not match", "cap is below", "issued after", "had expired", "WINDOW_HOURS = 24", "THRESHOLD_USD = 50000", "serializable transaction", approval.rule_hash]) {
    assert.ok(policy.includes(needle), `policy should include: ${needle}`);
  }
});

test("the rule JSON carries the same hash the approval is bound to", () => {
  const json = JSON.parse(a.files[3]!.content);
  assert.equal(json.rule_hash, approval.rule_hash);
  assert.equal(a.rule_hash, approval.rule_hash);
});

test("the PR body states the hash, the test count and the loophole outcome", () => {
  assert.match(a.pr_body, /16 \/ 16 passed/);
  assert.match(a.pr_body, /Loophole check: 13 cases/);
  assert.match(a.pr_body, /closed: Two \$40,000 orders/);
  assert.match(a.pr_body, /owner decided: Exactly at the threshold/);
  assert.ok(a.pr_body.includes(approval.rule_hash));
});

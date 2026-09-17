import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLoopholes, improvedRule, naiveRule, standardLoopholes } from "@everrule/loophole-engine";
import { buildMatrix, runMatrix } from "@everrule/rule-tests";
import { generateProtection } from "../src/index";

const approval = { approver_name: "J. Ellis", approver_role: "Director of Procurement Operations", approved_at: "2026-09-16T00:00:00Z", rationale: "test", edited: false };

function artifact() {
  const v1 = naiveRule(); const v2 = improvedRule();
  const checks = checkLoopholes(v1, v2, standardLoopholes(v1));
  const results = runMatrix(v2, buildMatrix(v2, 78_000, checks));
  return generateProtection(v2, approval, checks, results, "INC-482", 78_000);
}

test("the artifact carries four files and a patch touching all of them", () => {
  const a = artifact();
  assert.deepEqual(a.files.map((f) => f.path), ["src/purchase-orders.ts", "src/procurement-policy.ts", "src/procurement-policy.test.ts", "src/purchase-orders.test.ts"]);
  for (const f of a.files) assert.match(a.patch, new RegExp(`\\+\\+\\+ b/${f.path.replace(/[.]/g, "\\.")}`));
});

test("the generated policy encodes every approval requirement of the rule", () => {
  const a = artifact();
  const policy = a.files[1].content;
  for (const needle of ["already used", "not a director", "own request", "different vendor", "currency does not match", "cap is below", "issued after", "has expired", "WINDOW_HOURS = 24", "THRESHOLD_USD = 50000"]) {
    assert.ok(policy.includes(needle), `policy should include: ${needle}`);
  }
});

test("the PR body lists the nine closed loopholes and the test count", () => {
  const a = artifact();
  assert.match(a.pr_body, /18 \/ 18 passed/);
  assert.equal((a.pr_body.match(/^- /gm) ?? []).length, 9 + 2 + 4);
});

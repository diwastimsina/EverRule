import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLoopholes, improvedRule, naiveRule, standardLoopholes } from "@everrule/loophole-engine";
import { buildMatrix, runMatrix } from "@everrule/rule-tests";
import { generateProtection } from "@everrule/policy-generator";
import { prPlan, targetFromEnv } from "../lib/github";

const approval = { approver_name: "J. Ellis", approver_role: "Director", approved_at: "2026-09-16T00:00:00Z", rationale: "", edited: false };
const v1 = naiveRule(), v2 = improvedRule();
const checks = checkLoopholes(v1, v2, standardLoopholes(v1));
const artifact = generateProtection(v2, approval, checks, runMatrix(v2, buildMatrix(v2, 78_000, checks)), "INC-482", 78_000);

test("the PR plan names a unique branch and carries all four files", () => {
  const p = prPlan(artifact, new Date("2026-09-22T10:20:30Z"));
  assert.equal(p.branch, "everrule/er-proc-019-v2-20260922-102030");
  assert.deepEqual(p.files.map((f) => f.path).sort(), ["src/procurement-policy.test.ts", "src/procurement-policy.ts", "src/purchase-orders.test.ts", "src/purchase-orders.ts"]);
  assert.match(p.body, /18 \/ 18 passed/);
});

test("PR creation stays off unless token, owner and repo are all set", () => {
  assert.equal(targetFromEnv({}), null);
  assert.equal(targetFromEnv({ GITHUB_TOKEN: "x", GITHUB_TARGET_OWNER: "o" }), null);
  assert.deepEqual(targetFromEnv({ GITHUB_TOKEN: "x", GITHUB_TARGET_OWNER: "o", GITHUB_TARGET_REPO: "r" }), { token: "x", owner: "o", repo: "r", base: "main" });
  assert.deepEqual(targetFromEnv({ GITHUB_TOKEN: "x", GITHUB_OWNER: "o", GITHUB_TARGET_REPO: "r", GITHUB_BASE_BRANCH: "dev" }), { token: "x", owner: "o", repo: "r", base: "dev" });
  assert.equal(targetFromEnv({ DEMO_MODE: "true", GITHUB_TOKEN: "x", GITHUB_OWNER: "o", GITHUB_TARGET_REPO: "r" }), null);
});

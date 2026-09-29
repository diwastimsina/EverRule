import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLoopholes, improvedRule, naiveRule, ruleHash, standardLoopholes } from "@everrule/loophole-engine";
import { buildMatrix, runMatrix } from "@everrule/rule-tests";
import { generateProtection } from "@everrule/policy-generator";
import { assertSafeFiles, prPlan, targetFromEnv } from "../lib/github";
import { allow } from "../lib/rate-limit";

const v1 = naiveRule(), v2 = improvedRule();
const approval = { approver_name: "J. Ellis", approver_role: "Director", approved_at: "2026-09-16T00:00:00Z", rationale: "", edited: false, decision: "approved" as const, rule_hash: ruleHash(v2) };
const checks = checkLoopholes(v1, v2, standardLoopholes(v1));
const artifact = generateProtection(v2, approval, checks, runMatrix(v2, buildMatrix(v2, 78_000)), "INC-482", 78_000);

test("the PR plan names a unique branch and carries all five files", () => {
  const p = prPlan(artifact, new Date("2026-09-22T10:20:30Z"));
  assert.equal(p.branch, "everrule/er-proc-019-v2-20260922-102030");
  assert.deepEqual(p.files.map((f) => f.path).sort(), ["everrule/ER-PROC-019.json", "src/procurement-policy.test.ts", "src/procurement-policy.ts", "src/purchase-orders.test.ts", "src/purchase-orders.ts"]);
  assert.match(p.body, /16 \/ 16 passed/);
});

test("PR creation stays off unless token, owner and repo are all set", () => {
  assert.equal(targetFromEnv({}), null);
  assert.equal(targetFromEnv({ GITHUB_TOKEN: "x", GITHUB_TARGET_OWNER: "o" }), null);
  assert.deepEqual(targetFromEnv({ GITHUB_TOKEN: "x", GITHUB_TARGET_OWNER: "o", GITHUB_TARGET_REPO: "r" }), { token: "x", owner: "o", repo: "r", base: "main" });
  assert.deepEqual(targetFromEnv({ GITHUB_TOKEN: "x", GITHUB_OWNER: "o", GITHUB_TARGET_REPO: "r", GITHUB_BASE_BRANCH: "dev" }), { token: "x", owner: "o", repo: "r", base: "dev" });
  assert.deepEqual(targetFromEnv({ GITHUB_TOKEN: "x", GITHUB_REPO: "o/r" }), { token: "x", owner: "o", repo: "r", base: "main" });
});

test("only generator-shaped paths under src/ are ever written", () => {
  assert.doesNotThrow(() => assertSafeFiles(artifact.files));
  for (const bad of ["../x.ts", ".github/workflows/ci.yml", "src/../package.json", "src/a/b.ts", "/src/x.ts", "src/x.ts?x", "src/x.js", "everrule/../x.json", "everrule/x.json"]) {
    assert.throws(() => assertSafeFiles([{ path: bad, content: "" }]), `should reject ${bad}`);
  }
  assert.throws(() => assertSafeFiles(Array(9).fill({ path: "src/a.ts", content: "" })));
});

test("a newline in the rule text cannot escape the generated comment", () => {
  const evil = { ...artifact, rule: { ...artifact.rule, plain_english: "ok\nprocess.exit(1)" } };
  const p = prPlan({ ...evil, files: generateProtection(evil.rule, approval, checks, [], "INC-482", 1).files });
  const policy = p.files.find((f) => f.path === "src/procurement-policy.ts")!.content;
  assert.ok(!policy.includes("\nprocess.exit"), "newline must be flattened");
});

test("rotating the rate-limit key does not escape the global ceiling", () => {
  const w = 60_000, t0 = 1_000_000;
  let ok = 0;
  for (let i = 0; i < 50; i++) if (allow(`ip-${i}`, 5, w, 20, t0)) ok++;
  assert.equal(ok, 20);
  assert.equal(allow("ip-0", 5, w, 20, t0 + w + 1), true);
});

// The PR route must refuse a rule that no longer matches the hash its approval
// is bound to, before it talks to GitHub.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLoopholes, improvedRule, naiveRule, ruleHash, standardLoopholes } from "@everrule/loophole-engine";

process.env.GITHUB_TOKEN = "test-token-never-used";
process.env.GITHUB_REPO = "owner/repo";
delete process.env.DEMO_PASSWORD;

const v1 = naiveRule(), v2 = improvedRule();
const checks = checkLoopholes(v1, v2, standardLoopholes(v1));
const approval = { approver_name: "J", approver_role: "Director", approved_at: "2026-09-29T00:00:00Z", rationale: "", edited: false, decision: "approved" as const, rule_hash: ruleHash(v2) };

test("a rule edited after approval is refused with 409", async () => {
  const { POST } = await import("../app/api/pr/route");
  const edited = { ...v2, plain_english: v2.plain_english.replace("24 hours", "48 hours") };
  const res = await POST(new Request("http://localhost/api/pr", { method: "POST", headers: { "content-type": "application/json", host: "localhost" }, body: JSON.stringify({ rule: edited, approval, checks, incident_id: "INC-482", exposure: 78000 }) }));
  assert.equal(res.status, 409);
  assert.match((await res.json()).error, /changed after it was approved/);
});

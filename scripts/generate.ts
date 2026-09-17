// Runs the deterministic half of the demo pipeline on the sample incident and
// writes the outputs to generated/. CI checks these files are current.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { checkLoopholes, improvedRule, naiveRule, standardLoopholes } from "@everrule/loophole-engine";
import { buildMatrix, runMatrix } from "@everrule/rule-tests";
import { generateProtection } from "@everrule/policy-generator";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const approval = { approver_name: "J. Ellis", approver_role: "Director of Procurement Operations", approved_at: "2026-09-16T00:00:00Z", rationale: "Split orders were not considered until the loophole check. Aggregating by vendor over 24 hours matches how the team already thinks about vendor exposure.", edited: false };

const v1 = naiveRule(); const v2 = improvedRule();
const checks = checkLoopholes(v1, v2, standardLoopholes(v1));
const results = runMatrix(v2, buildMatrix(v2, 78_000, checks));
const artifact = generateProtection(v2, approval, checks, results, "INC-482", 78_000);

const out: Record<string, string> = {
  "generated/rules/ER-PROC-019.v1.json": JSON.stringify(v1, null, 2) + "\n",
  "generated/rules/ER-PROC-019.v2.json": JSON.stringify({ ...v2, approval }, null, 2) + "\n",
  "generated/rules/ER-PROC-019.loopholes.json": JSON.stringify(checks.map((c) => ({ id: c.loophole.id, category: c.loophole.category, title: c.loophole.title, initial_allows: c.initial.allowed, improved_allows: c.improved.allowed })), null, 2) + "\n",
  "generated/rules/ER-PROC-019.tests.json": JSON.stringify(results.map((r) => ({ id: r.test.id, category: r.test.category, name: r.test.name, expect: r.test.expect, passed: r.passed })), null, 2) + "\n",
  "generated/policies/procurement-policy.ts": artifact.files[1].content,
  "generated/policies/procurement-policy.test.ts": artifact.files[2].content,
  "generated/policies/ER-PROC-019.patch": artifact.patch,
  "generated/policies/PR.md": `# ${artifact.pr_title}\n\n${artifact.pr_body}`,
};

const check = process.argv.includes("--check");
let stale = 0;
for (const [rel, content] of Object.entries(out)) {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  if (check) {
    let current = ""; try { current = readFileSync(file, "utf8"); } catch {}
    if (current !== content) { stale += 1; console.error(`stale: ${rel}`); }
  } else {
    writeFileSync(file, content);
    console.log(`wrote ${rel}`);
  }
}
if (check && stale > 0) { console.error(`${stale} generated file(s) out of date. Run: pnpm generate`); process.exit(1); }
if (check) console.log("generated/ is current");

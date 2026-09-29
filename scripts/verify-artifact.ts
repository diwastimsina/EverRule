// Falsification check. Runs the generated tests against the generated guard
// (all must pass), then against a guard that never throws (the incident test
// must fail). A test file that passes either way proves nothing.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const work = path.join(root, ".artifact-check");
const gen = path.join(root, "generated/policies");

function stage(guardless: boolean) {
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  copyFileSync(path.join(root, "scripts/harness/procurement-api.ts"), path.join(work, "procurement-api.ts"));
  for (const f of ["purchase-orders.ts", "purchase-orders.test.ts", "procurement-policy.test.ts"]) copyFileSync(path.join(gen, f), path.join(work, f));
  if (guardless) {
    writeFileSync(path.join(work, "procurement-policy.ts"), `import type { PurchaseOrderRequest } from "./procurement-api";
export class PolicyViolation extends Error {}
export async function enforce(_po: PurchaseOrderRequest): Promise<void> {}
`);
  } else {
    copyFileSync(path.join(gen, "procurement-policy.ts"), path.join(work, "procurement-policy.ts"));
  }
}

function run(): { pass: number; fail: number; out: string } {
  const r = spawnSync(process.execPath, ["--import", "tsx", "--test", "purchase-orders.test.ts", "procurement-policy.test.ts"], { cwd: work, encoding: "utf8" });
  const out = (r.stdout ?? "") + (r.stderr ?? "");
  const n = (k: string) => Number(new RegExp(`ℹ ${k} (\\d+)`).exec(out)?.[1] ?? NaN);
  return { pass: n("pass"), fail: n("fail"), out };
}

stage(false);
const withGuard = run();
stage(true);
const without = run();
rmSync(work, { recursive: true, force: true });

const incidentFailsWithout = /✖ INC-482/.test(without.out);
console.log(`with the generated guard:  ${withGuard.pass} pass, ${withGuard.fail} fail`);
console.log(`with a guard that never throws: ${without.pass} pass, ${without.fail} fail; incident test ${incidentFailsWithout ? "fails" : "PASSES"}`);

if (!(withGuard.fail === 0 && withGuard.pass > 0)) { console.error(withGuard.out); process.exit(1); }
if (!(without.fail > 0 && incidentFailsWithout)) { console.error("The generated tests do not catch a missing guard."); process.exit(1); }
console.log("falsification check passed");

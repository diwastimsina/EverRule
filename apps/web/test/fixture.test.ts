// The fixture assistant must read the three sample files for real and produce
// the analysis the demo depends on. If the sample data changes, this catches it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { FixtureAssistant } from "../lib/assistant/fixture";

const dir = path.resolve(new URL(".", import.meta.url).pathname, "../../../demo-data/procurement");
const files = ["incident-summary.md", "agent-log.json", "procurement-audit.csv"].map((name) => ({ name, content: readFileSync(path.join(dir, name), "utf8") }));

test("the fixture reads the amount, vendor and cancellation fee from the sample files", async () => {
  const a = await new FixtureAssistant().analyzeIncident({ description: "x", impact_amount: null, files });
  assert.equal(a.incident_id, "INC-482");
  assert.equal(a.amount, 78_000);
  assert.equal(a.vendor_id, "VEND-2291");
  const loss = a.impact.find((i) => i.category === "realized_loss");
  assert.equal(loss?.amount, 2_100);
  assert.ok(a.timeline.some((t) => t.status === "not_verifiable"), "something must be labeled not verifiable");
});

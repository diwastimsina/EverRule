// The parser must compute every confirmed fact from the sample files, take the
// effect from the audit row, and keep the execution context separate.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { parseEvidence, EvidenceError } from "../lib/evidence";
import { SAMPLE_FILES } from "../lib/sample-data";

const e = parseEvidence(SAMPLE_FILES);

test("the effect is the $78,000 commitment to VEND-2291, from the audit export", () => {
  assert.deepEqual([e.effect.commitment_id, e.effect.vendor_id, e.effect.amount, e.effect.currency, e.effect.source], ["PO-88219", "VEND-2291", 78_000, "USD", "procurement-audit.csv"]);
  assert.equal(e.incident_id, "INC-482");
});

test("the execution context names the agent, the tool and the trace, and nothing about money", () => {
  assert.deepEqual([e.execution.actor_type, e.execution.agent_id, e.execution.path, e.execution.tool_name, e.execution.trace_id], ["ai_agent", "procurement-agent", "tool_call", "createPurchaseOrder", "trace-7f3c21"]);
  assert.ok(!JSON.stringify(e.execution).includes("78000"));
});

test("every file is fingerprinted with SHA-256 of its exact bytes", () => {
  assert.equal(e.files.length, 3);
  for (const f of e.files) {
    const src = SAMPLE_FILES.find((s) => s.name === f.name)!;
    assert.equal(f.sha256, createHash("sha256").update(src.content).digest("hex"));
  }
});

test("the realized loss is the fee, and the agent's reasoning is not verifiable", () => {
  assert.equal(e.impact.find((i) => i.category === "realized_loss")?.amount, 2_100);
  assert.ok(e.timeline.some((t) => t.status === "not_verifiable"));
});

test("a missing audit export is a plain error, not partial facts", () => {
  assert.throws(() => parseEvidence(SAMPLE_FILES.filter((f) => !f.name.endsWith(".csv"))), EvidenceError);
});

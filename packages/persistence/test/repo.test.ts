import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLoopholes, improvedRule, naiveRule, ruleHash, standardLoopholes } from "@everrule/loophole-engine";
import { buildMatrix, runMatrix } from "@everrule/rule-tests";
import { generateProtection } from "@everrule/policy-generator";
import type { ApprovalRecord, IncidentAnalysis } from "@everrule/rule-schema";
import { openMemoryDb, Repo } from "../src/index";

const analysis: IncidentAnalysis = {
  incident_id: "INC-482",
  title: "Unauthorized purchase order",
  summary: "The agent created a $78,000 PO with no director approval.",
  effect: { type: "financial_commitment_created", resource: "purchase_order", action: "create", commitment_id: "PO-88219", vendor_id: "V-1042", amount: 78000, currency: "USD", occurred_at: "2026-08-17T14:04:02Z", source: "audit.csv" },
  execution: { actor_type: "ai_agent", agent_id: "proc-agent-v17", model: null, path: "tool_call", tool_name: "createPurchaseOrder", trace_id: "tr-8f31c2", source: "agent-log.json" },
  files: [{ name: "agent-log.json", sha256: "a".repeat(64), bytes: 10 }, { name: "audit.csv", sha256: "b".repeat(64), bytes: 20 }],
  timeline: [
    { time: "2026-08-17T14:03:48Z", actor: "proc-agent-v17", action: "called createPurchaseOrder for $78,000", evidence: ["agent-log.json"], status: "confirmed" },
    { time: null, actor: "procurement", action: "approval lookup returned no record", evidence: ["audit.csv"], status: "confirmed" },
  ],
  impact: [{ category: "unauthorized_exposure", amount: 78000, status: "confirmed", note: null }],
  missing_evidence: ["Policy version active at execution time"],
};

test("the whole chain persists and reads back as lineage, scoped by workspace", async () => {
  const db = await openMemoryDb();
  const repo = new Repo(db, "test");
  await repo.ensureOrg("org_test", "Test", "test");

  const incidentId = await repo.createIncident("org_test", analysis, { description: "sample", synthetic: true, parser: "procurement-v1", workflow: "procurement" });

  const v1 = naiveRule();
  const v2 = improvedRule();
  const checks = checkLoopholes(v1, v2, standardLoopholes(v1));
  const { ruleId, versionId } = await repo.createRule("org_test", incidentId, v1, v2, checks);

  // The owner edits the wording after proposal: the approval binds to the edited version, not the proposed one.
  const edited = { ...v2, plain_english: v2.plain_english + " (owner edit)" };
  const approval: ApprovalRecord = { approver_name: "Owner", approver_role: "Head of Procurement Ops", approved_at: new Date().toISOString(), rationale: "ok", edited: true, decision: "approved", rule_hash: ruleHash(edited) };
  const results = runMatrix(edited, buildMatrix(edited, 78000));
  const { versionId: approvedVersion } = await repo.recordApproval("org_test", ruleId, edited, approval, results);
  assert.notEqual(approvedVersion, versionId);

  const artifact = generateProtection(edited, approval, checks, results, "INC-482", 78000);
  const artifactId = await repo.recordArtifact("org_test", ruleId, approvedVersion, artifact, null, "EverRule: prevent recurrence of INC-482", "body");
  await repo.setArtifactStatus("org_test", artifactId, { mergeStatus: "merged", confirmedBy: "sponsor" });

  const lineage = await repo.ruleLineage("org_test", ruleId);
  assert.ok(lineage);
  assert.deepEqual(lineage.versions.map((v) => v.version.kind), ["initial", "improved", "edited"]);
  assert.equal(lineage.versions[0]!.loopholes.filter((l) => l.status === "loophole").length, 1);
  assert.equal(lineage.versions[1]!.loopholes.filter((l) => l.status === "loophole").length, 0);
  assert.equal(lineage.versions[2]!.approvals[0]!.ruleHash, ruleHash(edited));
  assert.equal(lineage.versions[2]!.suites[0]!.passed, results.filter((r) => r.passed).length);
  assert.equal(lineage.versions[2]!.artifacts[0]!.mergeStatus, "merged");
  assert.equal(lineage.versions[2]!.artifacts[0]!.confirmedBy, "sponsor");
  assert.equal(lineage.rule.status, "approved");

  assert.equal((await repo.listIncidents("org_other")).length, 0);
  assert.equal(await repo.ruleLineage("org_other", ruleId), null);

  const actions = (await repo.auditTrail("org_test")).map((a) => a.action).sort();
  assert.deepEqual(actions, ["artifact.generate", "artifact.status", "incident.create", "rule.approve", "rule.create"]);
});

test("an approval whose hash does not match the presented rule is refused", async () => {
  const db = await openMemoryDb();
  const repo = new Repo(db, "test");
  await repo.ensureOrg("org_test", "Test", "test");
  const incidentId = await repo.createIncident("org_test", analysis, { description: "s", synthetic: true, parser: "procurement-v1", workflow: "procurement" });
  const v1 = naiveRule();
  const { ruleId } = await repo.createRule("org_test", incidentId, v1, null, checkLoopholes(v1, v1, standardLoopholes(v1)));
  const bad: ApprovalRecord = { approver_name: "x", approver_role: "y", approved_at: new Date().toISOString(), rationale: "", edited: false, decision: "approved", rule_hash: "0".repeat(64) };
  await assert.rejects(() => repo.recordApproval("org_test", ruleId, v1, bad, []), /does not match/);
});

test("a mutation whose audit write fails leaves no rows behind", async () => {
  const db = await openMemoryDb();
  const repo = new Repo(db, "test");
  await repo.ensureOrg("org_test", "Test", "test");
  const proto = Repo.prototype as unknown as { audit: () => Promise<void> };
  const original = proto.audit;
  proto.audit = async () => { throw new Error("audit store unavailable"); };
  try {
    await assert.rejects(() => repo.createIncident("org_test", analysis, { description: "s", synthetic: true, parser: "procurement-v1", workflow: "procurement" }), /audit store unavailable/);
  } finally {
    proto.audit = original;
  }
  assert.equal((await repo.listIncidents("org_test")).length, 0);
});

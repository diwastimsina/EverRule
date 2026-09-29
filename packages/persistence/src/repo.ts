// The only way to read or write business tables. Every function takes orgId and
// scopes by it; every mutation writes an audit row. No deletes: rows are
// superseded or retired. Types come from @everrule/rule-schema so the stored
// shapes are the same ones the pipeline produces.
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { ruleHash } from "@everrule/loophole-engine";
import type { ApprovalRecord, CandidateRule, EvidenceFileRecord, IncidentAnalysis, LoopholeCheck, ProtectionArtifact, TestResult } from "@everrule/rule-schema";
import type { Db } from "./client";
import * as t from "./schema";

export interface IncidentMeta {
  description: string;
  synthetic: boolean;
  parser: string;
  workflow: string;
}

export interface PullRequestRef { url: string; branch: string }

export class Repo {
  constructor(private readonly db: Db, private readonly actor: string) {}

  /** Runs fn in one transaction, so a mutation and its audit row land together or not at all. */
  private atomic<T>(fn: (repo: Repo) => Promise<T>): Promise<T> {
    // Both drivers expose the same transaction API; the union type does not unify their signatures.
    const db = this.db as unknown as { transaction<R>(cb: (tx: Db) => Promise<R>): Promise<R> };
    return db.transaction((tx) => fn(new Repo(tx, this.actor)));
  }

  async ensureOrg(orgId: string, name: string, slug: string): Promise<void> {
    const rows = await this.db.select({ id: t.organizations.id }).from(t.organizations).where(eq(t.organizations.id, orgId));
    if (rows.length === 0) await this.db.insert(t.organizations).values({ id: orgId, name, slug });
  }

  private async audit(orgId: string, action: string, objectType: string, objectId: string, details?: unknown): Promise<void> {
    await this.db.insert(t.auditLog).values({ id: randomUUID(), orgId, actor: this.actor, action, objectType, objectId, detailsJson: (details ?? null) as object | null });
  }

  /** Stores the analysis as produced: effect, execution, timeline, impact, missing evidence, file hashes. */
  createIncident(orgId: string, analysis: IncidentAnalysis, meta: IncidentMeta): Promise<string> {
    return this.atomic((r) => r.createIncidentTx(orgId, analysis, meta));
  }

  private async createIncidentTx(orgId: string, analysis: IncidentAnalysis, meta: IncidentMeta): Promise<string> {
    const id = randomUUID();
    const exposure = analysis.impact.find((i) => i.amount !== null);
    await this.db.insert(t.incidents).values({
      id, orgId, incidentKey: analysis.incident_id, title: analysis.title, workflow: meta.workflow, parser: meta.parser, synthetic: meta.synthetic,
      impactType: exposure?.category ?? "unauthorized_exposure", impactAmount: exposure?.amount ?? null, currency: analysis.effect.currency,
      factsJson: { effect: analysis.effect, timeline: analysis.timeline, impact: analysis.impact, missing_evidence: analysis.missing_evidence, description: meta.description },
      executionJson: analysis.execution, explanationJson: { summary: analysis.summary },
    });
    for (const f of analysis.files as EvidenceFileRecord[]) {
      await this.db.insert(t.evidenceItems).values({ id: randomUUID(), orgId, incidentId: id, name: f.name, bytes: f.bytes, sha256: f.sha256 });
    }
    let pos = 0;
    for (const item of analysis.timeline) {
      await this.db.insert(t.facts).values({ id: randomUUID(), orgId, incidentId: id, status: item.status, text: `${item.actor}: ${item.action}`, citesJson: item.evidence, position: pos++ });
    }
    for (const m of analysis.missing_evidence) {
      await this.db.insert(t.facts).values({ id: randomUUID(), orgId, incidentId: id, status: "not_verifiable", text: m, citesJson: [], position: pos++ });
    }
    await this.audit(orgId, "incident.create", "incident", id, { incidentKey: analysis.incident_id, parser: meta.parser, synthetic: meta.synthetic });
    return id;
  }

  /** First draft and, when the split transaction was found, the improved rule. Both versions keep their loophole checks. */
  createRule(orgId: string, incidentId: string, initial: CandidateRule, improved: CandidateRule | null, checks: LoopholeCheck[]): Promise<{ ruleId: string; versionId: string }> {
    return this.atomic((r) => r.createRuleTx(orgId, incidentId, initial, improved, checks));
  }

  private async createRuleTx(orgId: string, incidentId: string, initial: CandidateRule, improved: CandidateRule | null, checks: LoopholeCheck[]): Promise<{ ruleId: string; versionId: string }> {
    const ruleId = randomUUID();
    await this.db.insert(t.rules).values({ id: ruleId, orgId, ruleKey: initial.rule_id, workflow: "procurement", shape: initial.params.aggregate ? "threshold_aggregate_approval" : "threshold_approval", sourceIncidentId: incidentId, status: "draft" });
    const v1 = await this.insertVersion(orgId, ruleId, initial, "initial", null);
    await this.insertChecks(orgId, v1, checks, "initial");
    let current = v1;
    if (improved) {
      current = await this.insertVersion(orgId, ruleId, improved, "improved", v1);
      await this.insertChecks(orgId, current, checks, "improved");
      await this.db.update(t.rules).set({ shape: improved.params.aggregate ? "threshold_aggregate_approval" : "threshold_approval" }).where(eq(t.rules.id, ruleId));
    }
    await this.db.update(t.rules).set({ currentVersionId: current }).where(and(eq(t.rules.id, ruleId), eq(t.rules.orgId, orgId)));
    await this.audit(orgId, "rule.create", "rule", ruleId, { ruleKey: initial.rule_id, versions: improved ? 2 : 1 });
    return { ruleId, versionId: current };
  }

  private async insertVersion(orgId: string, ruleId: string, rule: CandidateRule, kind: "initial" | "improved" | "edited", supersedes: string | null): Promise<string> {
    const id = randomUUID();
    await this.db.insert(t.ruleVersions).values({ id, orgId, ruleId, version: rule.version, ruleHash: ruleHash(rule), ruleJson: rule, plainLanguage: rule.plain_english, kind, supersedes });
    return id;
  }

  private async insertChecks(orgId: string, ruleVersionId: string, checks: LoopholeCheck[], side: "initial" | "improved"): Promise<void> {
    for (const c of checks) {
      const decision = side === "initial" ? c.initial : c.improved;
      const cls = side === "initial" ? c.initial_class : c.improved_class;
      await this.db.insert(t.loopholeRuns).values({
        id: randomUUID(), orgId, ruleVersionId, caseKey: c.loophole.id, name: c.loophole.title, literal: decision.allowed ? "allow" : "deny", intent: c.loophole.intent, status: cls,
        recommendation: cls === "holds" ? null : c.loophole.recommendation, caseJson: c.loophole.scenario,
      });
    }
  }

  /** Binds the approval to the version whose hash the approver saw. An owner edit after proposal gets its own version first. */
  recordApproval(orgId: string, ruleId: string, rule: CandidateRule, approval: ApprovalRecord, results: TestResult[]): Promise<{ versionId: string }> {
    return this.atomic((r) => r.recordApprovalTx(orgId, ruleId, rule, approval, results));
  }

  private async recordApprovalTx(orgId: string, ruleId: string, rule: CandidateRule, approval: ApprovalRecord, results: TestResult[]): Promise<{ versionId: string }> {
    const versions = await this.db.select().from(t.ruleVersions).where(and(eq(t.ruleVersions.ruleId, ruleId), eq(t.ruleVersions.orgId, orgId))).orderBy(desc(t.ruleVersions.version), desc(t.ruleVersions.createdAt));
    const latest = versions[0];
    if (approval.rule_hash !== ruleHash(rule)) throw new Error("Approval hash does not match the rule presented for approval.");
    const versionId = latest && latest.ruleHash === approval.rule_hash ? latest.id : await this.insertVersion(orgId, ruleId, rule, "edited", latest?.id ?? null);
    await this.db.insert(t.approvals).values({ id: randomUUID(), orgId, ruleVersionId: versionId, approverName: approval.approver_name, approverTitle: approval.approver_role, decision: approval.decision, rationale: approval.rationale, ruleHash: approval.rule_hash, decidedAt: new Date(approval.approved_at) });
    await this.db.insert(t.testSuites).values({ id: randomUUID(), orgId, ruleVersionId: versionId, passed: results.filter((r) => r.passed).length, total: results.length, resultsJson: results.map((r) => ({ id: r.test.id, category: r.test.category, name: r.test.name, expect: r.test.expect, passed: r.passed, reason: r.reason })) });
    await this.db.update(t.rules).set({ currentVersionId: versionId, status: "approved", ownerName: `${approval.approver_name}, ${approval.approver_role}` }).where(and(eq(t.rules.id, ruleId), eq(t.rules.orgId, orgId)));
    await this.audit(orgId, "rule.approve", "rule_version", versionId, { approver: approval.approver_name, ruleHash: approval.rule_hash, edited: approval.edited });
    return { versionId };
  }

  recordArtifact(orgId: string, ruleId: string, versionId: string, artifact: ProtectionArtifact, pr: PullRequestRef | null, pr_title: string, pr_body: string): Promise<string> {
    return this.atomic((r) => r.recordArtifactTx(orgId, ruleId, versionId, artifact, pr, pr_title, pr_body));
  }

  private async recordArtifactTx(orgId: string, ruleId: string, versionId: string, artifact: ProtectionArtifact, pr: PullRequestRef | null, pr_title: string, pr_body: string): Promise<string> {
    const id = randomUUID();
    await this.db.insert(t.artifacts).values({ id, orgId, ruleVersionId: versionId, target: "typescript", filesJson: artifact.files, prTitle: pr_title, prBody: pr_body, prUrl: pr?.url ?? null, branch: pr?.branch ?? null, exportStatus: pr ? "sent" : "generated" });
    await this.db.update(t.rules).set({ status: pr ? "exported" : "approved" }).where(and(eq(t.rules.id, ruleId), eq(t.rules.orgId, orgId)));
    await this.audit(orgId, pr ? "artifact.export" : "artifact.generate", "artifact", id, { prUrl: pr?.url ?? null, ruleHash: artifact.rule_hash });
    return id;
  }

  /** Sponsor confirmation and merge status are recorded, never inferred. */
  setArtifactStatus(orgId: string, artifactId: string, patch: { mergeStatus?: "merged" | "closed"; confirmedBy?: string }): Promise<void> {
    return this.atomic((r) => r.setArtifactStatusTx(orgId, artifactId, patch));
  }

  private async setArtifactStatusTx(orgId: string, artifactId: string, patch: { mergeStatus?: "merged" | "closed"; confirmedBy?: string }): Promise<void> {
    const values: Partial<typeof t.artifacts.$inferInsert> = {};
    if (patch.mergeStatus) values.mergeStatus = patch.mergeStatus;
    if (patch.confirmedBy) { values.confirmedBy = patch.confirmedBy; values.confirmedAt = new Date(); }
    await this.db.update(t.artifacts).set(values).where(and(eq(t.artifacts.id, artifactId), eq(t.artifacts.orgId, orgId)));
    await this.audit(orgId, "artifact.status", "artifact", artifactId, patch);
  }

  async logModelCall(orgId: string, incidentId: string | null, purpose: string, provider: string, model: string, promptVersion: string, inputSha256: string, output: unknown): Promise<void> {
    await this.db.insert(t.modelCalls).values({ id: randomUUID(), orgId, incidentId, purpose, provider, model, promptVersion, inputSha256, outputJson: output as object });
  }

  listIncidents(orgId: string) {
    return this.db.select({ id: t.incidents.id, incidentKey: t.incidents.incidentKey, title: t.incidents.title, workflow: t.incidents.workflow, impactType: t.incidents.impactType, impactAmount: t.incidents.impactAmount, currency: t.incidents.currency, status: t.incidents.status, synthetic: t.incidents.synthetic, createdAt: t.incidents.createdAt })
      .from(t.incidents).where(eq(t.incidents.orgId, orgId)).orderBy(desc(t.incidents.createdAt));
  }

  listRules(orgId: string) {
    return this.db.select({ id: t.rules.id, ruleKey: t.rules.ruleKey, workflow: t.rules.workflow, shape: t.rules.shape, status: t.rules.status, ownerName: t.rules.ownerName, sourceIncidentId: t.rules.sourceIncidentId, currentVersionId: t.rules.currentVersionId, createdAt: t.rules.createdAt })
      .from(t.rules).where(eq(t.rules.orgId, orgId)).orderBy(desc(t.rules.createdAt));
  }

  /** One rule's lineage: every version with its approvals, loophole runs, test suites and artifacts. */
  async ruleLineage(orgId: string, ruleId: string) {
    const [rule] = await this.db.select().from(t.rules).where(and(eq(t.rules.id, ruleId), eq(t.rules.orgId, orgId)));
    if (!rule) return null;
    const versions = await this.db.select().from(t.ruleVersions).where(and(eq(t.ruleVersions.ruleId, ruleId), eq(t.ruleVersions.orgId, orgId))).orderBy(t.ruleVersions.version, t.ruleVersions.createdAt);
    const out = [];
    for (const v of versions) {
      const [approvalRows, loopholes, suites, artifactRows] = await Promise.all([
        this.db.select().from(t.approvals).where(eq(t.approvals.ruleVersionId, v.id)),
        this.db.select().from(t.loopholeRuns).where(eq(t.loopholeRuns.ruleVersionId, v.id)),
        this.db.select().from(t.testSuites).where(eq(t.testSuites.ruleVersionId, v.id)),
        this.db.select().from(t.artifacts).where(eq(t.artifacts.ruleVersionId, v.id)),
      ]);
      out.push({ version: v, approvals: approvalRows, loopholes, suites, artifacts: artifactRows });
    }
    return { rule, versions: out };
  }

  auditTrail(orgId: string, limit = 100) {
    return this.db.select().from(t.auditLog).where(eq(t.auditLog.orgId, orgId)).orderBy(desc(t.auditLog.at)).limit(limit);
  }
}

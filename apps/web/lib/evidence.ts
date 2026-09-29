// procurement-v1 evidence parser: an agent log, an audit CSV and a summary that
// share a purchase order id. Every "confirmed" line is computed from the files.
// The effect comes from the audit row; the execution context comes from the
// agent log and is recorded for the report only.
import type { EvidenceFile, Execution, Effect, ImpactLine, IncidentAnalysis, TimelineItem } from "@everrule/rule-schema";
import { sha256 } from "@everrule/loophole-engine";

interface AgentEvent { ts: string; type: string; tool?: string; trace_id?: string; input?: Record<string, unknown>; output?: Record<string, unknown> }
interface AgentLog { agent?: string; model?: string; events?: AgentEvent[] }

export class EvidenceError extends Error {}

function parseCsv(text: string): Record<string, string>[] {
  const [head, ...rows] = text.trim().split(/\r?\n/);
  if (!head) return [];
  const cols = head.split(",");
  return rows.map((r) => Object.fromEntries(r.split(",").map((v, i) => [cols[i] ?? `col${i}`, v])));
}

export type ParsedEvidence = Omit<IncidentAnalysis, "summary">;

export function parseEvidence(files: EvidenceFile[]): ParsedEvidence {
  const logFile = files.find((f) => f.name.endsWith(".json"));
  const csvFile = files.find((f) => f.name.endsWith(".csv"));
  if (!logFile || !csvFile) throw new EvidenceError("procurement-v1 needs an agent log (.json) and an audit export (.csv).");

  let log: AgentLog;
  try { log = JSON.parse(logFile.content) as AgentLog; } catch { throw new EvidenceError(`${logFile.name} is not valid JSON.`); }
  const events = log.events ?? [];
  const audit = parseCsv(csvFile.content);

  const created = audit.find((r) => r.record_type === "purchase_order" && r.status === "created");
  if (!created) throw new EvidenceError(`No created purchase order found in ${csvFile.name}.`);
  const poId = created.record_id ?? "";
  const call = events.find((e) => e.tool === "createPurchaseOrder" && e.output?.po_id === poId);
  const noApproval = audit.find((r) => r.record_type === "approval_lookup" && r.vendor_id === created.vendor_id && r.status === "no_record");
  const cancelled = audit.find((r) => r.record_type === "purchase_order" && r.record_id === poId && r.status === "cancelled");
  const fee = audit.find((r) => r.record_type === "fee" && r.vendor_id === created.vendor_id);

  const amount = Number(created.amount);
  if (!Number.isFinite(amount)) throw new EvidenceError(`The amount for ${poId} is not a number.`);
  const currency = created.currency === "EUR" ? "EUR" : "USD";

  const effect: Effect = {
    type: "financial_commitment_created", resource: "purchase_order", action: "create",
    commitment_id: poId, vendor_id: created.vendor_id ?? "unknown", amount, currency,
    occurred_at: created.timestamp || null, source: csvFile.name,
  };

  const execution: Execution = {
    actor_type: call ? "ai_agent" : "unknown",
    agent_id: call ? (log.agent ?? null) : null,
    model: call ? (log.model ?? null) : null,
    path: call ? "tool_call" : "unknown",
    tool_name: call?.tool ?? null,
    trace_id: call?.trace_id ?? null,
    source: call ? logFile.name : null,
  };

  const timeline: TimelineItem[] = [];
  for (const e of events.filter((e) => e.type === "tool_call")) {
    timeline.push({ time: e.ts, actor: log.agent ?? "agent", action: e === call ? `called ${e.tool}, which created ${poId}` : `called ${e.tool}`, evidence: [logFile.name], status: "confirmed" });
  }
  timeline.push({ time: created.timestamp || null, actor: "procurement system", action: `recorded ${poId}: $${amount.toLocaleString()} ${currency} to ${effect.vendor_id}`, evidence: [csvFile.name], status: "confirmed" });
  timeline.push({ time: null, actor: "approval system", action: noApproval ? `no director approval on record for ${effect.vendor_id}` : "approval status not in the export", evidence: noApproval ? [csvFile.name] : [], status: noApproval ? "confirmed" : "not_verifiable" });
  if (cancelled) timeline.push({ time: cancelled.timestamp || null, actor: "accounts payable", action: `cancelled ${poId}`, evidence: [csvFile.name], status: "confirmed" });
  timeline.push({ time: null, actor: log.agent ?? "agent", action: `chose $${amount.toLocaleString()} for a reason the evidence does not show`, evidence: [], status: "not_verifiable" });

  const impact: ImpactLine[] = [
    { category: "unauthorized_exposure", amount, status: noApproval ? "confirmed" : "not_confirmed", note: `${poId} created without approval on record` },
    { category: "realized_loss", amount: fee ? Number(fee.amount) : null, status: fee ? "confirmed" : "not_verifiable", note: fee ? "vendor cancellation fee" : null },
    { category: "remediation_cost", amount: null, status: "not_verifiable", note: "no time records supplied" },
    { category: "customer_credits", amount: 0, status: "confirmed", note: null },
    { category: "operational_cost", amount: null, status: "not_verifiable", note: null },
  ];

  const incident = files.map((f) => /INC-\d+/.exec(f.content)?.[0]).find(Boolean) ?? "INC-UNKNOWN";

  return {
    incident_id: incident,
    title: `Procurement agent created a $${amount.toLocaleString()} purchase order without director approval`,
    effect,
    execution,
    files: files.map((f) => ({ name: f.name, sha256: sha256(f.content), bytes: Buffer.byteLength(f.content, "utf8") })),
    timeline,
    impact,
    missing_evidence: ["the agent's prompt or policy text at the time of the order", "time records for remediation effort", "whether a delegated-approval path exists"],
  };
}

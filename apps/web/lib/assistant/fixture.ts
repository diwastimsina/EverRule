// Deterministic assistant for the sample incident. Parses the three demo files
// for real, but only knows this one incident's shape. No network.
import type { CandidateRule, ImpactLine, IncidentAnalysis, IncidentInput, Loophole, TimelineItem } from "@everrule/rule-schema";
import { improvedRule, naiveRule, standardLoopholes } from "@everrule/loophole-engine";
import type { RuleAssistant } from "./types";

interface AgentEvent { ts: string; type: string; tool?: string; input?: Record<string, unknown>; output?: Record<string, unknown>; text?: string }

function parseCsv(text: string): Record<string, string>[] {
  const [head, ...rows] = text.trim().split("\n");
  const cols = head.split(",");
  return rows.map((r) => Object.fromEntries(r.split(",").map((v, i) => [cols[i], v])));
}

export class FixtureAssistant implements RuleAssistant {
  readonly name = "fixture" as const;

  async analyzeIncident(input: IncidentInput): Promise<IncidentAnalysis> {
    const log = input.files.find((f) => f.name.endsWith(".json"));
    const csv = input.files.find((f) => f.name.endsWith(".csv"));
    const events: AgentEvent[] = log ? (JSON.parse(log.content).events ?? []) : [];
    const audit = csv ? parseCsv(csv.content) : [];

    const create = events.find((e) => e.tool === "createPurchaseOrder");
    const amount = Number(create?.input?.amount ?? input.impact_amount ?? 0);
    const vendor = String(create?.input?.vendor_id ?? "unknown-vendor");
    const poId = String(create?.output?.po_id ?? "unknown-po");
    const noApproval = audit.find((r) => r.record_type === "approval_lookup" && r.status === "no_record");
    const cancelled = audit.find((r) => r.record_type === "purchase_order" && r.status === "cancelled");
    const fee = audit.find((r) => r.record_type === "fee");

    const timeline: TimelineItem[] = [];
    for (const e of events.filter((e) => e.type === "tool_call")) {
      timeline.push({
        time: e.ts, actor: "procurement-agent",
        action: e.tool === "createPurchaseOrder" ? `created ${poId} for $${amount.toLocaleString()} to ${vendor}` : `called ${e.tool}`,
        evidence: ["agent-log.json"], status: "confirmed",
      });
    }
    timeline.push({ time: null, actor: "approval system", action: noApproval ? `no director approval on record for ${vendor}` : "approval status unknown", evidence: noApproval ? ["procurement-audit.csv"] : [], status: noApproval ? "confirmed" : "not_verifiable" });
    if (cancelled) timeline.push({ time: cancelled.timestamp, actor: "accounts payable", action: `cancelled ${poId}`, evidence: ["procurement-audit.csv"], status: "confirmed" });
    timeline.push({ time: null, actor: "procurement-agent", action: "chose the $78,000 amount for a reason the evidence does not show", evidence: [], status: "not_verifiable" });

    const impact: ImpactLine[] = [
      { category: "unauthorized_exposure", amount, status: "confirmed", note: `${poId} created without approval` },
      { category: "realized_loss", amount: fee ? Number(fee.amount) : null, status: fee ? "confirmed" : "not_verifiable", note: fee ? "vendor cancellation fee" : null },
      { category: "remediation_cost", amount: null, status: "not_verifiable", note: "no time records supplied" },
      { category: "customer_credits", amount: 0, status: "confirmed", note: null },
      { category: "operational_cost", amount: null, status: "not_verifiable", note: null },
    ];

    return {
      incident_id: "INC-482",
      title: `Procurement agent created a $${amount.toLocaleString()} purchase order without director approval`,
      summary: `The procurement agent created ${poId} for $${amount.toLocaleString()} to ${vendor} without verified director approval. The approval system has no record for this vendor. The order was cancelled two days later.`,
      vendor_id: vendor,
      amount,
      timeline,
      impact,
      missing_evidence: ["the agent's prompt or policy text at version 2026.08.1", "time records for remediation effort", "whether a delegated-approval path exists"],
    };
  }

  async proposeRule(_input: IncidentAnalysis): Promise<CandidateRule> {
    return naiveRule(50_000);
  }

  async findLoopholes(rule: CandidateRule): Promise<Loophole[]> {
    return standardLoopholes(rule);
  }

  async improveRule(rule: CandidateRule, _loopholes: Loophole[]): Promise<CandidateRule> {
    return improvedRule(rule.params.threshold, 24);
  }
}

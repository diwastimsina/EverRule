// Model-backed assistant. Every call returns schema-validated JSON. The model
// proposes; the deterministic engine and a human decide. On any failure the
// caller falls back to the fixture so a live demo never stalls.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CandidateRule, IncidentAnalysis, Loophole, RuleParams } from "@everrule/rule-schema";
import type { IncidentInput } from "@everrule/rule-schema";
import type { RuleAssistant } from "./types";

const MODEL = process.env.LLM_MODEL ?? "";

const SYSTEM = `You are EverRule's analyst. You turn evidence about an AI-agent incident into a plain-English timeline, a candidate prevention rule, and loophole cases.
Rules you must follow:
- Every claim is labeled confirmed, not_confirmed, or not_verifiable. Never guess. Missing facts stay missing.
- Impact is split by category. An unauthorized purchase order is exposure, not a realized loss, unless the evidence shows money left.
- You propose. A human approves. Never mark anything approved.
- Cite evidence by file name. List assumptions separately from evidence.
- Write short, direct sentences. No filler.`;

export class ModelAssistant implements RuleAssistant {
  readonly name = "model" as const;
  private client = new Anthropic();

  async analyzeIncident(input: IncidentInput): Promise<IncidentAnalysis> {
    const evidence = input.files.map((f) => `### ${f.name}\n${f.content}`).join("\n\n");
    const res = await this.client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content: `Description from the customer: ${input.description}\nStated impact: ${input.impact_amount ?? "not stated"}\n\nEvidence files:\n\n${evidence}\n\nProduce the incident analysis. Use incident_id INC-482 if the evidence names it. vendor_id and amount must come from the evidence.` }],
      output_config: { format: zodOutputFormat(IncidentAnalysis) },
    });
    if (!res.parsed_output) throw new Error("analysis did not parse");
    return res.parsed_output;
  }

  async proposeRule(analysis: IncidentAnalysis): Promise<CandidateRule> {
    const Proposal = z.object({ plain_english: z.string(), threshold: z.number(), evidence_citations: z.array(z.string()), assumptions: z.array(z.string()), missing_evidence: z.array(z.string()) });
    const res = await this.client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content: `Incident analysis:\n${JSON.stringify(analysis, null, 2)}\n\nPropose the single most obvious prevention rule the incident reveals, as the business would first state it. One sentence. State the USD threshold as a number.` }],
      output_config: { format: zodOutputFormat(Proposal) },
    });
    const p = res.parsed_output;
    if (!p) throw new Error("proposal did not parse");
    return {
      rule_id: "ER-PROC-019", version: 1, plain_english: p.plain_english,
      effect: { resource: "purchase_order", action: "create" },
      params: { threshold: p.threshold, currency: "USD", aggregate: null, approval: { role: "director", check_role: false, scoped_to_vendor: false, must_precede_request: false, must_not_be_expired: false, single_use: false, no_self_approval: false, cap_covers_commitment: false, currency_must_match: false } },
      evidence_citations: p.evidence_citations, assumptions: p.assumptions, missing_evidence: p.missing_evidence,
    };
  }

  async findLoopholes(rule: CandidateRule): Promise<Loophole[]> {
    const res = await this.client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content: `Candidate rule:\n${JSON.stringify(rule, null, 2)}\n\nList concrete ways the literal rule can be satisfied while the business intent is violated. Use these categories: split_aggregate, wrong_scope, wrong_identity, stale_evidence, timing_reversal, replay_reuse, boundary, alternate_currency. Each loophole is a concrete scenario with amounts, vendor VEND-2291, requester procurement-agent, and an approval record where relevant. Aim for 6 to 9 cases. Ids LH-1, LH-2, ...` }],
      output_config: { format: zodOutputFormat(z.object({ loopholes: z.array(Loophole) })) },
    });
    if (!res.parsed_output) throw new Error("loopholes did not parse");
    return res.parsed_output.loopholes;
  }

  async improveRule(rule: CandidateRule, loopholes: Loophole[]): Promise<CandidateRule> {
    const Improved = z.object({ plain_english: z.string(), params: RuleParams, assumptions: z.array(z.string()) });
    const res = await this.client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content: `Initial rule:\n${JSON.stringify(rule, null, 2)}\n\nLoopholes found:\n${JSON.stringify(loopholes.map((l) => ({ category: l.category, title: l.title })), null, 2)}\n\nRewrite the rule so every listed loophole is closed. Keep the threshold. Set aggregate by vendor with a 24 hour window and turn on every approval requirement the loopholes justify. One or two sentences of plain English. Missing evidence must mean refuse.` }],
      output_config: { format: zodOutputFormat(Improved) },
    });
    const p = res.parsed_output;
    if (!p) throw new Error("improved rule did not parse");
    return { ...rule, version: 2, plain_english: p.plain_english, params: p.params, assumptions: p.assumptions };
  }
}

// Model-backed assistant, used only in llm mode. It writes the summary and the
// first-draft rule's wording and threshold. Structured output, validated with
// the same schemas. Facts, loopholes, tests and approval never come from here.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { CandidateRule } from "@everrule/rule-schema";
import { naiveRule } from "@everrule/loophole-engine";
import { modelName } from "../config";
import type { ParsedEvidence } from "../evidence";
import type { RuleAssistant } from "./types";

const SYSTEM = `You are EverRule's analyst. You explain an AI-agent incident from evidence that has already been parsed, and you draft the business rule that should have stopped it.
- Use only the facts given. Do not add facts. Say what is not verified.
- An unauthorized purchase order is exposure, not a realized loss, unless the evidence shows money left.
- You propose. A human approves. Never say anything is approved or deployed.
- Short, direct sentences. No filler.`;

function model(): string {
  const m = modelName();
  if (!m) throw new Error("EVERRULE_MODEL is not set");
  return m;
}

export class ModelAssistant implements RuleAssistant {
  readonly name = "model" as const;
  private client = new Anthropic();

  async explain(e: ParsedEvidence): Promise<string> {
    const res = await this.client.messages.parse({
      model: model(),
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content: `Parsed evidence:\n${JSON.stringify({ effect: e.effect, execution: e.execution, timeline: e.timeline, impact: e.impact, missing: e.missing_evidence }, null, 2)}\n\nWrite a two or three sentence summary of what happened.` }],
      output_config: { format: zodOutputFormat(z.object({ summary: z.string() })) },
    });
    if (!res.parsed_output) throw new Error("summary did not parse");
    return res.parsed_output.summary;
  }

  async proposeRule(e: ParsedEvidence, explanation: string): Promise<CandidateRule> {
    const Proposal = z.object({ plain_english: z.string(), threshold_usd: z.number().positive(), assumptions: z.array(z.string()) });
    const res = await this.client.messages.parse({
      model: model(),
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content: `Summary: ${explanation}\nEffect: ${JSON.stringify(e.effect)}\n\nDraft the single most obvious prevention rule, as the business would first state it: one sentence, a USD threshold above which a valid director approval for that order is required.` }],
      output_config: { format: zodOutputFormat(Proposal) },
    });
    const p = res.parsed_output;
    if (!p) throw new Error("proposal did not parse");
    const base = naiveRule(p.threshold_usd);
    return { ...base, plain_english: p.plain_english, assumptions: p.assumptions.length ? p.assumptions : base.assumptions };
  }
}

// Deterministic assistant. The whole demo runs on it with no keys.
import type { CandidateRule } from "@everrule/rule-schema";
import { naiveRule } from "@everrule/loophole-engine";
import type { ParsedEvidence } from "../evidence";
import type { RuleAssistant } from "./types";

export class DemoAssistant implements RuleAssistant {
  readonly name = "demo" as const;

  async explain(e: ParsedEvidence): Promise<string> {
    const cancelled = e.timeline.some((t) => t.actor === "accounts payable");
    return `The procurement agent created ${e.effect.commitment_id} for $${e.effect.amount.toLocaleString()} to ${e.effect.vendor_id} without a director approval on record.${cancelled ? " Accounts payable cancelled it two days later." : ""}`;
  }

  async proposeRule(_e: ParsedEvidence, _explanation: string): Promise<CandidateRule> {
    return naiveRule(50_000);
  }
}

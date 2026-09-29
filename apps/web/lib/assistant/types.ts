import type { CandidateRule } from "@everrule/rule-schema";
import type { ParsedEvidence } from "../evidence";

/** The model may explain and draft. It cannot confirm a fact, approve a rule, decide a test, or claim deployment. */
export interface RuleAssistant {
  readonly name: "model" | "demo";
  explain(evidence: ParsedEvidence): Promise<string>;
  proposeRule(evidence: ParsedEvidence, explanation: string): Promise<CandidateRule>;
}

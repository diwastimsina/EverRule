import type { CandidateRule, IncidentAnalysis, IncidentInput, Loophole } from "@everrule/rule-schema";

export interface RuleAssistant {
  readonly name: "model" | "fixture";
  analyzeIncident(input: IncidentInput): Promise<IncidentAnalysis>;
  proposeRule(input: IncidentAnalysis): Promise<CandidateRule>;
  findLoopholes(rule: CandidateRule): Promise<Loophole[]>;
  improveRule(rule: CandidateRule, loopholes: Loophole[]): Promise<CandidateRule>;
}

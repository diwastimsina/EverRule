import { ModelAssistant } from "./model";
import { FixtureAssistant } from "./fixture";
import type { RuleAssistant } from "./types";

export type { RuleAssistant };

export function pickAssistant(useSample: boolean): RuleAssistant {
  if (!useSample && process.env.ANTHROPIC_API_KEY) return new ModelAssistant();
  return new FixtureAssistant();
}

/** Run a step on the chosen assistant; on failure, run it on the fixture and say so. */
export async function withFallback<T>(assistant: RuleAssistant, step: (a: RuleAssistant) => Promise<T>): Promise<{ value: T; source: RuleAssistant["name"]; fallback_reason: string | null }> {
  try {
    return { value: await step(assistant), source: assistant.name, fallback_reason: null };
  } catch (err) {
    if (assistant.name === "fixture") throw err;
    const reason = err instanceof Error ? err.message : String(err);
    return { value: await step(new FixtureAssistant()), source: "fixture", fallback_reason: reason };
  }
}

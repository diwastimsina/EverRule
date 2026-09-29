import { modelConfigured } from "../config";
import { DemoAssistant } from "./demo";
import { ModelAssistant } from "./model";
import type { RuleAssistant } from "./types";

export type { RuleAssistant };

export function pickAssistant(): RuleAssistant {
  return modelConfigured() ? new ModelAssistant() : new DemoAssistant();
}

/** Run a step on the chosen assistant; on failure, run it on the demo assistant and say so. */
export async function withFallback<T>(assistant: RuleAssistant, step: (a: RuleAssistant) => Promise<T>): Promise<{ value: T; source: RuleAssistant["name"]; fallback_reason: string | null }> {
  try {
    return { value: await step(assistant), source: assistant.name, fallback_reason: null };
  } catch (err) {
    if (assistant.name === "demo") throw err;
    return { value: await step(new DemoAssistant()), source: "demo", fallback_reason: err instanceof Error ? err.message : String(err) };
  }
}

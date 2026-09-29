// Run mode. Demo is the default and needs no keys. llm mode lets the model
// write the summary and first-draft rule, and allows uploads; it is for pilots
// and for comparing the model with the demo templates, never the public demo.
export type Mode = "demo" | "llm";

export function mode(env: Record<string, string | undefined> = process.env): Mode {
  if (env.DEMO_MODE === "true") return "demo";
  return env.EVERRULE_MODE === "llm" ? "llm" : "demo";
}

export function modelName(env: Record<string, string | undefined> = process.env): string | null {
  return env.EVERRULE_MODEL || env.LLM_MODEL || null;
}

export function modelConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return mode(env) === "llm" && !!env.ANTHROPIC_API_KEY && !!modelName(env);
}

/** Uploads are a pilot feature. The public demo is sample-only. */
export function uploadsAllowed(env: Record<string, string | undefined> = process.env): boolean {
  return mode(env) === "llm";
}

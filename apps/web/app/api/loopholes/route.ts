import { NextResponse } from "next/server";
import { z } from "zod";
import { CandidateRule } from "@everrule/rule-schema";
import { checkLoopholes } from "@everrule/loophole-engine";
import { pickAssistant, withFallback } from "@/lib/assistant";

const Body = z.object({ rule: CandidateRule, use_sample: z.boolean() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { rule, use_sample } = parsed.data;
  const assistant = pickAssistant(use_sample);
  const proposed = await withFallback(assistant, (a) => a.findLoopholes(rule));
  const improved = await withFallback(assistant, (a) => a.improveRule(rule, proposed.value));
  // The engine, not the model, decides which loopholes are real and which the improved rule closes.
  const checks = checkLoopholes(rule, improved.value, proposed.value);
  return NextResponse.json({ checks, improved: improved.value, source: improved.source, fallback_reason: proposed.fallback_reason ?? improved.fallback_reason });
}

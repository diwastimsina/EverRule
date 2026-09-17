import { NextResponse } from "next/server";
import { z } from "zod";
import { IncidentInput } from "@everrule/rule-schema";
import { pickAssistant, withFallback } from "@/lib/assistant";

const Body = z.object({ input: IncidentInput, use_sample: z.boolean() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { input, use_sample } = parsed.data;
  const assistant = pickAssistant(use_sample);
  const analysis = await withFallback(assistant, (a) => a.analyzeIncident(input));
  const rule = await withFallback(assistant, (a) => a.proposeRule(analysis.value));
  return NextResponse.json({ analysis: analysis.value, rule: rule.value, source: rule.source, fallback_reason: analysis.fallback_reason ?? rule.fallback_reason });
}

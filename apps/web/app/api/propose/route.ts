import { NextResponse } from "next/server";
import { z } from "zod";
import { IncidentAnalysis } from "@everrule/rule-schema";
import { pickAssistant, withFallback } from "@/lib/assistant";

const Body = z.object({ analysis: IncidentAnalysis, use_sample: z.boolean() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const rule = await withFallback(pickAssistant(parsed.data.use_sample), (a) => a.proposeRule(parsed.data.analysis));
  return NextResponse.json({ rule: rule.value, source: rule.source, fallback_reason: rule.fallback_reason });
}

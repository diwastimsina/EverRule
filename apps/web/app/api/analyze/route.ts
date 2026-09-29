import { NextResponse } from "next/server";
import { z } from "zod";
import { IncidentInput } from "@everrule/rule-schema";
import { pickAssistant, withFallback } from "@/lib/assistant";
import { uploadsAllowed } from "@/lib/config";
import { EvidenceError, parseEvidence } from "@/lib/evidence";
import { SAMPLE_FILES } from "@/lib/sample-data";
import { requireSession } from "@/lib/session";

const Body = z.union([
  z.object({ source: z.literal("sample") }),
  z.object({ source: z.literal("upload"), input: IncidentInput }),
]);

export async function POST(req: Request) {
  const denied = requireSession(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send { source: \"sample\" } or an upload." }, { status: 400 });
  if (parsed.data.source === "upload" && !uploadsAllowed()) return NextResponse.json({ error: "This demo runs on the sample incident only." }, { status: 403 });

  const files = parsed.data.source === "sample" ? SAMPLE_FILES : parsed.data.input.files;
  let evidence;
  try { evidence = parseEvidence(files); }
  catch (e) { return NextResponse.json({ error: e instanceof EvidenceError ? e.message : "Could not read the evidence." }, { status: 422 }); }

  const assistant = pickAssistant();
  const summary = await withFallback(assistant, (a) => a.explain(evidence));
  const rule = await withFallback(assistant, (a) => a.proposeRule(evidence, summary.value));
  return NextResponse.json({
    analysis: { ...evidence, summary: summary.value },
    rule: rule.value,
    source: rule.source,
    fallback_reason: summary.fallback_reason ?? rule.fallback_reason,
  });
}

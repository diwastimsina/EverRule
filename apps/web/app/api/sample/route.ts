import { NextResponse } from "next/server";
import { SAMPLE_DESCRIPTION, SAMPLE_FILES, SAMPLE_IMPACT } from "@/lib/sample-data";
import { requireSession } from "@/lib/session";

export function GET(req: Request) {
  const denied = requireSession(req);
  if (denied) return denied;
  return NextResponse.json({ description: SAMPLE_DESCRIPTION, impact_amount: SAMPLE_IMPACT, files: SAMPLE_FILES.map((f) => ({ name: f.name, bytes: f.content.length })) });
}

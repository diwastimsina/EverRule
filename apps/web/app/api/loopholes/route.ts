import { NextResponse } from "next/server";
import { z } from "zod";
import { CandidateRule } from "@everrule/rule-schema";
import { checkLoopholes, closeSplitTransaction, ruleHash, standardLoopholes } from "@everrule/loophole-engine";
import { requireSession } from "@/lib/session";

const Body = z.object({ rule: CandidateRule });

// Deterministic. The model never decides which loopholes are real.
export async function POST(req: Request) {
  const denied = requireSession(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send a candidate rule." }, { status: 400 });
  const { rule } = parsed.data;
  const cases = standardLoopholes(rule);
  const firstPass = checkLoopholes(rule, rule, cases);
  const splitIsReal = firstPass.some((c) => c.real && c.loophole.category === "split_aggregate");
  const improved = splitIsReal ? closeSplitTransaction(rule) : rule;
  const checks = checkLoopholes(rule, improved, cases);
  return NextResponse.json({ checks, improved, initial_hash: ruleHash(rule), improved_hash: ruleHash(improved) });
}

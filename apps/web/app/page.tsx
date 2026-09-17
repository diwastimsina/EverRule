"use client";

import { useState } from "react";
import type { ApprovalRecord, CandidateRule, EvidenceFile, IncidentAnalysis, LoopholeCheck, ProtectionArtifact, TestResult } from "@everrule/rule-schema";
import { IncidentScreen } from "@/components/IncidentScreen";
import { RuleScreen } from "@/components/RuleScreen";
import { ProtectionScreen } from "@/components/ProtectionScreen";

type Step = 1 | 2 | 3;

export interface Run {
  useSample: boolean;
  source: "model" | "fixture" | null;
  fallbackReason: string | null;
  analysis: IncidentAnalysis | null;
  rule: CandidateRule | null;
  checks: LoopholeCheck[];
  improved: CandidateRule | null;
  approval: ApprovalRecord | null;
  results: TestResult[];
  artifact: ProtectionArtifact | null;
}

const empty: Run = { useSample: true, source: null, fallbackReason: null, analysis: null, rule: null, checks: [], improved: null, approval: null, results: [], artifact: null };

async function post<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${url} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

export default function Page() {
  const [step, setStep] = useState<Step>(1);
  const [run, setRun] = useState<Run>(empty);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyze(description: string, impact: number | null, files: EvidenceFile[], useSample: boolean) {
    setBusy("Reading the evidence"); setError(null);
    try {
      const a = await post<{ analysis: IncidentAnalysis; rule: CandidateRule; source: Run["source"]; fallback_reason: string | null }>("/api/analyze", { input: { description, impact_amount: impact, files }, use_sample: useSample });
      setBusy("Checking the rule for loopholes");
      const l = await post<{ checks: LoopholeCheck[]; improved: CandidateRule; source: Run["source"]; fallback_reason: string | null }>("/api/loopholes", { rule: a.rule, use_sample: useSample });
      setRun({ ...empty, useSample, source: l.source, fallbackReason: a.fallback_reason ?? l.fallback_reason, analysis: a.analysis, rule: a.rule, checks: l.checks, improved: l.improved });
      setStep(2);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  }

  async function approve(finalRule: CandidateRule, approval: ApprovalRecord) {
    if (!run.analysis) return;
    setBusy("Running the tests"); setError(null);
    try {
      const p = await post<{ results: TestResult[]; artifact: ProtectionArtifact }>("/api/protect", { rule: finalRule, approval, checks: run.checks, incident_id: run.analysis.incident_id, exposure: run.analysis.amount });
      setRun({ ...run, improved: finalRule, approval, results: p.results, artifact: p.artifact });
      setStep(3);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  }

  return (
    <>
      <div className="steps">
        <span className={step === 1 ? "on" : ""}>1 Analyze incident</span>
        <span className={step === 2 ? "on" : ""}>2 Prevention rule</span>
        <span className={step === 3 ? "on" : ""}>3 Protection ready</span>
      </div>
      {step === 1 && <IncidentScreen busy={busy} onAnalyze={analyze} />}
      {step === 2 && run.analysis && run.rule && run.improved && (
        <RuleScreen run={run} busy={busy} onApprove={approve} onBack={() => setStep(1)} />
      )}
      {step === 3 && run.artifact && <ProtectionScreen run={run} onRestart={() => { setRun(empty); setStep(1); }} />}
      {error && <div className="error">{error}</div>}
    </>
  );
}

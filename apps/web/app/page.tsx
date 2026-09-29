"use client";

import { useEffect, useState } from "react";
import type { ApprovalInput, CandidateRule, EvidenceFile, IncidentAnalysis, LoopholeCheck, ProtectionArtifact, TestResult } from "@everrule/rule-schema";
import { IncidentScreen } from "@/components/IncidentScreen";
import { PasswordScreen } from "@/components/PasswordScreen";
import { ProtectionScreen } from "@/components/ProtectionScreen";
import { RuleScreen } from "@/components/RuleScreen";
import { post } from "@/lib/http";

type Step = 1 | 2 | 3;

export interface Session {
  state: "open" | "authenticated" | "locked" | "misconfigured";
  mode: "demo" | "llm" | null;
  uploads: boolean;
  pr_target: string | null;
}

export interface Run {
  source: "model" | "demo" | null;
  fallbackReason: string | null;
  analysis: IncidentAnalysis | null;
  rule: CandidateRule | null;
  initialHash: string | null;
  checks: LoopholeCheck[];
  improved: CandidateRule | null;
  improvedHash: string | null;
  results: TestResult[];
  artifact: ProtectionArtifact | null;
}

const empty: Run = { source: null, fallbackReason: null, analysis: null, rule: null, initialHash: null, checks: [], improved: null, improvedHash: null, results: [], artifact: null };

export default function Page() {
  const [session, setSession] = useState<Session | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [run, setRun] = useState<Run>(empty);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSession() {
    const r = await fetch("/api/session");
    setSession(await r.json());
  }
  useEffect(() => { void loadSession(); }, []);

  async function analyze(input: { source: "sample" } | { source: "upload"; description: string; impact: number | null; files: EvidenceFile[] }) {
    setBusy("Reading the evidence"); setError(null);
    try {
      const body = input.source === "sample" ? { source: "sample" } : { source: "upload", input: { description: input.description, impact_amount: input.impact, files: input.files } };
      const a = await post<{ analysis: IncidentAnalysis; rule: CandidateRule; source: Run["source"]; fallback_reason: string | null }>("/api/analyze", body);
      setBusy("Checking the rule for loopholes");
      const l = await post<{ checks: LoopholeCheck[]; improved: CandidateRule; initial_hash: string; improved_hash: string }>("/api/loopholes", { rule: a.rule });
      setRun({ ...empty, source: a.source, fallbackReason: a.fallback_reason, analysis: a.analysis, rule: a.rule, initialHash: l.initial_hash, checks: l.checks, improved: l.improved, improvedHash: l.improved_hash });
      setStep(2);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  }

  async function approve(finalRule: CandidateRule, approval: ApprovalInput) {
    if (!run.analysis) return;
    setBusy("Running the tests"); setError(null);
    try {
      const p = await post<{ results: TestResult[]; artifact: ProtectionArtifact }>("/api/protect", { rule: finalRule, approval, checks: run.checks, incident_id: run.analysis.incident_id, exposure: run.analysis.effect.amount });
      setRun({ ...run, improved: finalRule, results: p.results, artifact: p.artifact });
      setStep(3);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  }

  if (!session) return <p className="muted">Loading</p>;
  if (session.state === "misconfigured") return <div className="error">This deployment is closed because no demo password is set.</div>;
  if (session.state === "locked") return <PasswordScreen onUnlocked={loadSession} />;

  return (
    <>
      <div className="steps">
        <span className={step === 1 ? "on" : ""}>1 Analyze incident</span>
        <span className={step === 2 ? "on" : ""}>2 Prevention rule</span>
        <span className={step === 3 ? "on" : ""}>3 Protection ready</span>
      </div>
      {step === 1 && <IncidentScreen busy={busy} uploads={session.uploads} onAnalyze={analyze} />}
      {step === 2 && run.analysis && run.rule && run.improved && (
        <RuleScreen run={run} busy={busy} onApprove={approve} onBack={() => { setRun(empty); setStep(1); }} />
      )}
      {step === 3 && run.artifact && <ProtectionScreen run={run} prTarget={session.pr_target} onRestart={() => { setRun(empty); setStep(1); }} />}
      {error && <div className="error">{error}</div>}
    </>
  );
}

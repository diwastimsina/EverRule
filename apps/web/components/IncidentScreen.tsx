"use client";

import { useEffect, useState } from "react";
import type { EvidenceFile } from "@everrule/rule-schema";

interface Props {
  busy: string | null;
  onAnalyze: (description: string, impact: number | null, files: EvidenceFile[], useSample: boolean) => void;
}

export function IncidentScreen({ busy, onAnalyze }: Props) {
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState("");
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [isSample, setIsSample] = useState(false);

  async function useSample() {
    const r = await fetch("/api/sample");
    const s = await r.json();
    setDescription(s.description); setImpact(String(s.impact_amount)); setFiles(s.files); setIsSample(true);
  }

  useEffect(() => { void useSample(); }, []);

  async function onFiles(list: FileList | null) {
    if (!list) return;
    const read = await Promise.all(Array.from(list).map(async (f) => ({ name: f.name, content: await f.text() })));
    setFiles(read); setIsSample(false);
  }

  const ready = description.trim().length > 0 && files.length > 0 && !busy;

  return (
    <>
      <h1>Analyze an incident</h1>
      <p className="lead">Give EverRule what you already have. It reconstructs what happened, proposes the rule the incident teaches, and finds the loopholes before production does.</p>

      <div className="card">
        <label htmlFor="what">What went wrong?</label>
        <input id="what" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="AI procurement agent created an unauthorized purchase order" />

        <label htmlFor="impact">Impact in USD, if known</label>
        <input id="impact" type="text" inputMode="numeric" value={impact} onChange={(e) => setImpact(e.target.value)} placeholder="78000" />

        <label htmlFor="evidence">Evidence</label>
        <input id="evidence" type="file" multiple accept=".md,.json,.csv,.txt,.log" onChange={(e) => onFiles(e.target.files)} />
        {files.length > 0 && (
          <ul className="files">{files.map((f) => <li key={f.name}>{f.name}{isSample ? "  (sample)" : ""}</li>)}</ul>
        )}

        <div className="actions">
          <button className="primary" disabled={!ready} onClick={() => onAnalyze(description, impact ? Number(impact.replace(/[^0-9.]/g, "")) : null, files, isSample)}>
            {busy ?? "Analyze incident"}
          </button>
          <button className="link" onClick={useSample} disabled={!!busy}>Use sample incident</button>
        </div>
      </div>
      <p className="note">The sample is INC-482, a synthetic procurement incident. The parser is tuned for it. Real incidents come after discovery calls.</p>
    </>
  );
}

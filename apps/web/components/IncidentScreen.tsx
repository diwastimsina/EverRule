"use client";

import { useEffect, useState } from "react";
import type { EvidenceFile } from "@everrule/rule-schema";

type Analyze = (input: { source: "sample" } | { source: "upload"; description: string; impact: number | null; files: EvidenceFile[] }) => void;

export function IncidentScreen({ busy, uploads, onAnalyze }: { busy: string | null; uploads: boolean; onAnalyze: Analyze }) {
  const [sample, setSample] = useState<{ description: string; impact_amount: number; files: { name: string }[] } | null>(null);
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState("");
  const [files, setFiles] = useState<EvidenceFile[]>([]);

  useEffect(() => { fetch("/api/sample").then((r) => r.json()).then(setSample).catch(() => setSample(null)); }, []);

  async function onFiles(list: FileList | null) {
    if (!list) return;
    setFiles(await Promise.all(Array.from(list).map(async (f) => ({ name: f.name, content: await f.text() }))));
  }

  return (
    <>
      <h1>Analyze an incident</h1>
      <p className="lead">EverRule reconstructs what happened from the evidence, drafts the rule that should have stopped it, and checks that rule for loopholes before production does.</p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Sample incident</h2>
        <p className="quote">{sample?.description ?? "INC-482"}</p>
        <p className="note">Synthetic. Impact stated by the customer: ${sample?.impact_amount.toLocaleString() ?? "78,000"}.</p>
        <ul className="files">{(sample?.files ?? []).map((f) => <li key={f.name}>{f.name}</li>)}</ul>
        <div className="actions">
          <button className="primary" disabled={!!busy} onClick={() => onAnalyze({ source: "sample" })}>{busy ?? "Use the sample incident"}</button>
        </div>
      </div>

      {uploads && (
        <details className="card">
          <summary>Analyze your own evidence (pilot mode)</summary>
          <p className="note">procurement-v1 format: an agent log (.json), an audit export (.csv) and a summary (.md), sharing a purchase order id. Redact personal and card data first.</p>
          <label htmlFor="what">What went wrong?</label>
          <input id="what" type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          <label htmlFor="impact">Impact in USD, if known</label>
          <input id="impact" type="text" inputMode="numeric" value={impact} onChange={(e) => setImpact(e.target.value)} />
          <label htmlFor="evidence">Evidence</label>
          <input id="evidence" type="file" multiple accept=".md,.json,.csv,.txt" onChange={(e) => onFiles(e.target.files)} />
          {files.length > 0 && <ul className="files">{files.map((f) => <li key={f.name}>{f.name}</li>)}</ul>}
          <div className="actions">
            <button disabled={!!busy || !description.trim() || files.length === 0} onClick={() => onAnalyze({ source: "upload", description, impact: impact ? Number(impact.replace(/[^0-9.]/g, "")) : null, files })}>Analyze these files</button>
          </div>
        </details>
      )}
    </>
  );
}

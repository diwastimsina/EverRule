"use client";

import { useEffect, useState } from "react";
import type { Run } from "@/app/page";
import { downloadText } from "@/lib/download";

interface Props { run: Run; onRestart: () => void }

export function ProtectionScreen({ run, onRestart }: Props) {
  const a = run.artifact!, analysis = run.analysis!;
  const passed = run.results.filter((r) => r.passed).length;
  const closed = run.checks.filter((c) => c.real && c.closed).length;
  const [showCode, setShowCode] = useState(false);
  const [showPr, setShowPr] = useState(false);
  const [prConfig, setPrConfig] = useState<{ configured: boolean; target?: string } | null>(null);
  const [pr, setPr] = useState<{ url: string; number: number } | null>(null);
  const [prBusy, setPrBusy] = useState(false);
  const [prError, setPrError] = useState<string | null>(null);

  useEffect(() => { fetch("/api/pr").then((r) => r.json()).then(setPrConfig).catch(() => setPrConfig({ configured: false })); }, []);

  async function createPr() {
    setPrBusy(true); setPrError(null);
    try {
      const r = await fetch("/api/pr", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ artifact: a }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setPr(j);
    } catch (e) { setPrError(e instanceof Error ? e.message : String(e)); }
    finally { setPrBusy(false); }
  }

  return (
    <>
      <h1>✓ Protection ready</h1>
      <p className="lead">{a.rule.plain_english}</p>
      <p className="note">Approved by {a.approval.approver_name}, {a.approval.approver_role}, {new Date(a.approval.approved_at).toUTCString()}{a.approval.edited ? " (edited before approval)" : ""}.</p>

      <div className="stats">
        <div className="stat"><b>{closed}</b><span>loopholes closed</span></div>
        <div className="stat"><b>{passed} / {run.results.length}</b><span>rule tests passed</span></div>
        <div className="stat"><b>${analysis.amount.toLocaleString()}</b><span>historical exposure addressed</span></div>
      </div>

      <h2>Tests</h2>
      <div className="card">
        <table>
          <tbody>
            {run.results.map((r) => (
              <tr key={r.test.id}><td className="mono">{r.test.category.replace(/_/g, " ")}</td><td>{r.test.name}</td><td><span className={`pill ${r.passed ? "pass" : "fail"}`}>{r.passed ? "pass" : "fail"}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Protection</h2>
      <div className="card">
        <p>Destination: <span className="mono">everrule-demo-procurement-service</span>, the service that owns <span className="mono">createPurchaseOrder</span>. The guard lives in your code. It keeps working if EverRule is never contacted again.</p>
        <div className="actions">
          <button onClick={() => setShowCode((v) => !v)}>{showCode ? "Hide code" : "View code"}</button>
          <button onClick={() => downloadText("everrule-ER-PROC-019.patch", a.patch)}>Download patch</button>
          {prConfig?.configured && !pr ? (
            <button className="primary" disabled={prBusy} onClick={createPr}>{prBusy ? "Opening the PR" : "Create GitHub PR"}</button>
          ) : !pr ? (
            <button className="primary" onClick={() => setShowPr((v) => !v)}>{showPr ? "Hide PR" : "Create GitHub PR"}</button>
          ) : null}
        </div>
        {pr && (
          <div className="card ok" style={{ marginTop: 16 }}>
            <p><b>PR #{pr.number} is open</b> on <span className="mono">{prConfig?.target}</span>.</p>
            <p><a href={pr.url} target="_blank" rel="noreferrer">{pr.url}</a></p>
            <p className="note">Deployment stays unconfirmed until the repository owner merges it.</p>
          </div>
        )}
        {prError && <div className="error">{prError}</div>}
        {showPr && !pr && (
          <div style={{ marginTop: 16 }}>
            <p className="note">Apply the patch in the service repo and open the PR with this description. A one-click PR arrives when a customer asks for it.</p>
            <pre>{`git apply everrule-ER-PROC-019.patch\ngit checkout -b everrule/ER-PROC-019\ngit commit -am "${a.pr_title}"\ngh pr create --title "${a.pr_title}" --body-file pr.md`}</pre>
            <div className="actions"><button onClick={() => downloadText("pr.md", `# ${a.pr_title}\n\n${a.pr_body}`)}>Download PR description</button></div>
            <details><summary>PR description</summary><pre>{a.pr_body}</pre></details>
          </div>
        )}
        {showCode && a.files.map((f) => (
          <details key={f.path} open={f.path.endsWith("procurement-policy.ts")}><summary className="mono">{f.path}</summary><pre>{f.content}</pre></details>
        ))}
      </div>

      <div className="actions"><button className="link" onClick={onRestart}>Analyze another incident</button></div>
    </>
  );
}

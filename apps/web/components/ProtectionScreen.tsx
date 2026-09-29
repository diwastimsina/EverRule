"use client";

import { useState } from "react";
import type { Run } from "@/app/page";
import { post } from "@/lib/http";
import { downloadText } from "@/lib/download";

interface Props { run: Run; prTarget: string | null; onRestart: () => void }

export function ProtectionScreen({ run, prTarget, onRestart }: Props) {
  const a = run.artifact!, analysis = run.analysis!;
  const passed = run.results.filter((r) => r.passed).length;
  const closed = run.checks.filter((c) => c.real && c.closed).length;
  const [showCode, setShowCode] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [pr, setPr] = useState<{ url: string; number: number } | null>(null);
  const [prBusy, setPrBusy] = useState(false);
  const [prError, setPrError] = useState<string | null>(null);

  async function createPr() {
    setPrBusy(true); setPrError(null);
    try {
      setPr(await post<{ url: string; number: number }>("/api/pr", { rule: a.rule, approval: a.approval, checks: run.checks, incident_id: analysis.incident_id, exposure: analysis.effect.amount }));
    } catch (e) { setPrError(e instanceof Error ? e.message : String(e)); }
    finally { setPrBusy(false); }
  }

  return (
    <>
      <h1>✓ Protection ready</h1>
      <p className="lead">{a.rule.plain_english}</p>
      <p className="note">Approved by {a.approval.approver_name}, {a.approval.approver_role}, {new Date(a.approval.approved_at).toUTCString()}{a.approval.edited ? ", after editing the recommendation" : ""}. Bound to rule hash <span className="mono">{a.approval.rule_hash.slice(0, 16)}…</span></p>

      <div className="stats">
        <div className="stat"><b>{run.checks.length}</b><span>loophole cases checked, {closed} closed</span></div>
        <div className="stat"><b>{passed} / {run.results.length}</b><span>rule tests passed</span></div>
        <div className="stat"><b>${analysis.effect.amount.toLocaleString()}</b><span>exposure this rule addresses</span></div>
      </div>

      <h2>Tests</h2>
      <div className="card">
        <p className="note">Expected outcomes come from the owner's intent, written separately from the rule engine. The same cases ship with the guard.</p>
        <table>
          <tbody>
            {run.results.map((r) => (
              <tr key={r.test.id}><td className="mono">{r.test.category.replace(/_/g, " ")}</td><td>{r.test.name}</td><td className="mono">{r.test.expect}</td><td><span className={`pill ${r.passed ? "pass" : "fail"}`}>{r.passed ? "pass" : "fail"}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Protection</h2>
      <div className="card">
        <p>Destination: the service that owns <span className="mono">createPurchaseOrder</span>{prTarget ? <>, <span className="mono">{prTarget}</span></> : null}. The guard lives in that code and keeps working if EverRule is never contacted again.</p>
        <div className="actions">
          <button onClick={() => setShowCode((v) => !v)}>{showCode ? "Hide the code" : "View the code"}</button>
          <button onClick={() => downloadText(`everrule-${a.rule.rule_id}.patch`, a.patch)}>Download the patch</button>
          {prTarget && !pr && <button className="primary" disabled={prBusy} onClick={createPr}>{prBusy ? "Opening the pull request" : "Create the pull request"}</button>}
          {!prTarget && <button className="primary" onClick={() => setShowManual((v) => !v)}>{showManual ? "Hide the PR steps" : "Create the pull request"}</button>}
        </div>

        {pr && (
          <div className="card ok" style={{ marginTop: 16 }}>
            <p><b>Pull request #{pr.number} is open</b> on <span className="mono">{prTarget}</span>.</p>
            <p><a href={pr.url} target="_blank" rel="noreferrer">{pr.url}</a></p>
            <p className="note">Status: exported. Deployment stays unconfirmed until the repository owner merges it. EverRule never merges.</p>
          </div>
        )}
        {prError && <div className="error">{prError}</div>}

        {showManual && (
          <div style={{ marginTop: 16 }}>
            <p className="note">This deployment has no GitHub token, so apply the patch and open the PR by hand.</p>
            <pre>{`git apply everrule-${a.rule.rule_id}.patch\ngit checkout -b everrule/${a.rule.rule_id.toLowerCase()}\ngit add -A && git commit -m "${a.pr_title}"\ngh pr create --title "${a.pr_title}" --body-file pr.md`}</pre>
            <div className="actions"><button onClick={() => downloadText("pr.md", `# ${a.pr_title}\n\n${a.pr_body}`)}>Download the PR description</button></div>
          </div>
        )}
        <details><summary>PR description</summary><pre>{a.pr_body}</pre></details>
        {showCode && a.files.map((f) => (
          <details key={f.path} open={f.path.endsWith("procurement-policy.ts")}><summary className="mono">{f.path}</summary><pre>{f.content}</pre></details>
        ))}
      </div>

      <div className="actions"><button className="link" onClick={onRestart}>Start over</button></div>
    </>
  );
}

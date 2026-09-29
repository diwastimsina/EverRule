"use client";

import { useMemo, useState } from "react";
import type { ApprovalInput, CandidateRule, Classification } from "@everrule/rule-schema";
import type { Run } from "@/app/page";

interface Props { run: Run; busy: string | null; onApprove: (rule: CandidateRule, approval: ApprovalInput) => void; onBack: () => void }

const money = (n: number | null) => (n === null ? "unknown" : `$${n.toLocaleString()}`);
const label = (s: string) => s.replace(/_/g, " ");
const short = (h: string | null) => (h ? `${h.slice(0, 12)}…` : "");
const classLabel: Record<Classification, string> = { holds: "holds", loophole: "loophole", owner_decides: "your decision" };

export function RuleScreen({ run, busy, onApprove, onBack }: Props) {
  const analysis = run.analysis!, initial = run.rule!, improved = run.improved!;
  const threshold = improved.params.threshold;
  const [atOrAbove, setAtOrAbove] = useState(improved.params.operator === "gte");
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(improved.plain_english);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [rationale, setRationale] = useState("");

  const finalRule: CandidateRule = useMemo(() => {
    const op = atOrAbove ? "gte" : "gt";
    let wording = text.trim();
    if (!editing) wording = atOrAbove ? wording.replace(/totaling above/, "totaling at or above") : wording.replace(/totaling at or above/, "totaling above");
    return { ...improved, plain_english: wording, params: { ...improved.params, operator: op } };
  }, [atOrAbove, text, editing, improved]);
  const changed = finalRule.plain_english !== improved.plain_english || finalRule.params.operator !== improved.params.operator;

  const firstDraftLoopholes = run.checks.filter((c) => c.initial_class === "loophole");
  const ownerCases = run.checks.filter((c) => c.initial_class === "owner_decides");
  const e = analysis.effect, x = analysis.execution;
  const canApprove = name.trim() && role.trim() && !busy;

  return (
    <>
      <h1>Prevention rule</h1>
      {run.fallbackReason && <p className="note">The model call failed ({run.fallbackReason}), so the demo templates wrote this draft.</p>}

      <h2>What happened</h2>
      <div className="card">
        <p className="quote">{analysis.summary}</p>
        <table>
          <thead><tr><th>Actor</th><th>Action</th><th>Status</th></tr></thead>
          <tbody>
            {analysis.timeline.map((t, i) => (
              <tr key={i}><td>{t.actor}</td><td>{t.action}{t.evidence.length > 0 && <span className="muted mono"> [{t.evidence.join(", ")}]</span>}</td><td><span className={`pill ${t.status}`}>{label(t.status)}</span></td></tr>
            ))}
          </tbody>
        </table>
        <p className="note" style={{ marginTop: 12 }}>Unauthorized exposure {money(e.amount)}. {analysis.impact.filter((i) => i.category === "realized_loss").map((i) => `Realized loss ${money(i.amount)}${i.note ? ` (${i.note})` : ""}.`)} Exposure is not loss unless the evidence says money left.</p>
      </div>

      <div className="two">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Business effect</h2>
          <p><b>{money(e.amount)} {e.currency}</b> committed to <span className="mono">{e.vendor_id}</span> as <span className="mono">{e.commitment_id}</span>.</p>
          <p className="note">From {e.source}. The rule attaches here.</p>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>How the agent got there</h2>
          <p className="mono" style={{ fontSize: 14 }}>{x.agent_id ?? "unknown actor"} · {label(x.path)}{x.tool_name ? ` · ${x.tool_name}` : ""}{x.trace_id ? ` · ${x.trace_id}` : ""}</p>
          <p className="note">Recorded for the report. The rule never reads it, so a script or a browser reaching the same effect is held to the same rule.</p>
        </div>
      </div>

      <h2>First-draft rule</h2>
      <div className="card"><p className="quote">{initial.plain_english}</p></div>

      <h2>Loophole check: {run.checks.length} cases</h2>
      <div className="card warn">
        <p><b>{firstDraftLoopholes.length === 1 ? "1 loophole found." : `${firstDraftLoopholes.length} loopholes found.`}</b> {firstDraftLoopholes.map((c) => c.loophole.explanation).join(" ")}</p>
        <table>
          <thead><tr><th>Case</th><th>First draft</th><th>Recommended</th></tr></thead>
          <tbody>
            {run.checks.map((c) => (
              <tr key={c.loophole.id}>
                <td>{c.loophole.title}{c.initial_class !== "holds" && <div className="note">{c.loophole.recommendation}</div>}</td>
                <td><span className={`pill ${c.initial_class}`}>{classLabel[c.initial_class]}</span></td>
                <td><span className={`pill ${c.improved_class}`}>{classLabel[c.improved_class]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ownerCases.length > 0 && (
        <>
          <h2>Your decision</h2>
          <div className="card">
            <p>{ownerCases[0]!.loophole.explanation}</p>
            <label className="check"><input type="checkbox" checked={atOrAbove} onChange={(ev) => setAtOrAbove(ev.target.checked)} /> Require approval at exactly {money(threshold)} too</label>
          </div>
        </>
      )}

      <h2>Recommended rule</h2>
      <div className="card ok">
        {editing ? <textarea value={text} onChange={(ev) => setText(ev.target.value)} /> : <p className="quote">{finalRule.plain_english}</p>}
        <p className="note mono">{changed ? "Changed from the recommendation. A new rule hash is computed when you approve." : `Rule hash ${short(run.improvedHash)}`}</p>
        <details><summary>Assumptions and missing evidence</summary>
          <ul>{finalRule.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
          <p className="note">Not in evidence: {analysis.missing_evidence.join("; ")}.</p>
        </details>

        <label htmlFor="name">Approved by</label>
        <input id="name" type="text" value={name} onChange={(ev) => setName(ev.target.value)} placeholder="Your name" />
        <label htmlFor="role">Role</label>
        <input id="role" type="text" value={role} onChange={(ev) => setRole(ev.target.value)} placeholder="Director of Procurement Operations" />
        <label htmlFor="why">Why this rule (optional)</label>
        <input id="why" type="text" value={rationale} onChange={(ev) => setRationale(ev.target.value)} placeholder="Matches how we already think about vendor exposure" />

        <div className="actions">
          <button className="primary" disabled={!canApprove} onClick={() => onApprove(finalRule, { approver_name: name.trim(), approver_role: role.trim(), approved_at: new Date().toISOString(), rationale: rationale.trim(), edited: changed })}>{busy ?? "Approve this rule"}</button>
          <button onClick={() => { if (editing) setText(finalRule.plain_english); setEditing((v) => !v); }} disabled={!!busy}>{editing ? "Done editing" : "Edit the wording"}</button>
          <button className="link" onClick={onBack} disabled={!!busy}>Reject and start over</button>
        </div>
        <p className="note" style={{ marginTop: 12 }}>Approving binds your name to this exact rule. Any later edit is a new rule and needs a new approval.</p>
      </div>
    </>
  );
}

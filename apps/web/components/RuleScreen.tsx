"use client";

import { useState } from "react";
import type { ApprovalRecord, CandidateRule } from "@everrule/rule-schema";
import type { Run } from "@/app/page";

interface Props { run: Run; busy: string | null; onApprove: (rule: CandidateRule, approval: ApprovalRecord) => void; onBack: () => void }

const money = (n: number | null) => (n === null ? "unknown" : `$${n.toLocaleString()}`);
const label = (s: string) => s.replace(/_/g, " ");

export function RuleScreen({ run, busy, onApprove, onBack }: Props) {
  const analysis = run.analysis!, initial = run.rule!, improved = run.improved!;
  const real = run.checks.filter((c) => c.real);
  const closed = real.filter((c) => c.closed);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(improved.plain_english);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [rationale, setRationale] = useState("");
  const exposure = analysis.impact.find((i) => i.category === "unauthorized_exposure");

  const canApprove = name.trim() && role.trim() && !busy;

  function approve() {
    const edited = text.trim() !== improved.plain_english;
    onApprove({ ...improved, plain_english: text.trim() }, { approver_name: name.trim(), approver_role: role.trim(), approved_at: new Date().toISOString(), rationale: rationale.trim(), edited });
  }

  return (
    <>
      <h1>Prevention rule</h1>
      {run.source === "fixture" && run.fallbackReason && <p className="note">Model call failed ({run.fallbackReason}); showing the built-in analysis for the sample incident.</p>}

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
        <p className="note" style={{ marginTop: 12 }}>Unauthorized exposure {money(exposure?.amount ?? null)}. {analysis.impact.filter((i) => i.category === "realized_loss").map((i) => `Realized loss ${money(i.amount)}${i.note ? ` (${i.note})` : ""}.`)} Exposure is not loss unless the evidence says money left.</p>
      </div>

      <h2>Initial rule</h2>
      <div className="card"><p className="quote">{initial.plain_english}</p></div>

      <h2>Loopholes found</h2>
      <div className="card warn">
        <p><b>{real.length} ways to satisfy the initial rule and still violate its intent.</b> {closed.length} closed by the recommended rule.</p>
        <table>
          <tbody>
            {real.map((c) => (
              <tr key={c.loophole.id}><td className="mono">{label(c.loophole.category)}</td><td>{c.loophole.title}<div className="note">{c.loophole.explanation}</div></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Recommended rule</h2>
      <div className="card ok">
        {editing ? <textarea value={text} onChange={(e) => setText(e.target.value)} /> : <p className="quote">{text}</p>}
        <details><summary>Assumptions and missing evidence</summary>
          <ul>{improved.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
          <p className="note">Not in evidence: {improved.missing_evidence.join("; ")}.</p>
        </details>

        <label htmlFor="name">Approved by</label>
        <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        <label htmlFor="role">Role</label>
        <input id="role" type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Director of Procurement Operations" />
        <label htmlFor="why">Why this rule (optional)</label>
        <input id="why" type="text" value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Matches how we already think about vendor exposure" />

        <div className="actions">
          <button className="primary" disabled={!canApprove} onClick={approve}>{busy ?? "Approve rule"}</button>
          <button onClick={() => setEditing((v) => !v)} disabled={!!busy}>{editing ? "Done editing" : "Edit"}</button>
          <button className="link" onClick={onBack} disabled={!!busy}>Reject and start over</button>
        </div>
        <p className="note" style={{ marginTop: 12 }}>A rule is never final until a named person approves it. The approval is recorded in the protection package.</p>
      </div>
    </>
  );
}

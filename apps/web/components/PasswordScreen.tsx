"use client";

import { useState } from "react";

export function PasswordScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const r = await fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) onUnlocked(); else setError(j.error ?? "That did not work.");
  }

  return (
    <form className="card" onSubmit={submit} style={{ maxWidth: 440, margin: "48px auto" }}>
      <h1>EverRule demo</h1>
      <p className="lead">Enter the password you were sent with your call invite.</p>
      <label htmlFor="pw">Password</label>
      <input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <div className="actions"><button className="primary" disabled={!password || busy}>{busy ? "Checking" : "Open the demo"}</button></div>
      {error && <div className="error">{error}</div>}
    </form>
  );
}

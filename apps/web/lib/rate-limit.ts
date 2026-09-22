// Small in-memory limiter for the one endpoint that spends a credential.
// Per serverless instance. The token is scoped to a single synthetic repo,
// so the blast radius is spam PRs on a demo target, not data.
const hits = new Map<string, number[]>();
const MAX_KEYS = 1000;
const GLOBAL = "__global__";

function recent(key: string, windowMs: number, now: number): number[] {
  const r = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (r.length === 0) hits.delete(key); else hits.set(key, r);
  return r;
}

/** Per-key limit plus a global ceiling that key rotation cannot escape. */
export function allow(key: string, max: number, windowMs: number, globalMax = max * 4, now = Date.now()): boolean {
  if (hits.size > MAX_KEYS) for (const k of hits.keys()) { recent(k, windowMs, now); if (hits.size <= MAX_KEYS / 2) break; }
  const g = recent(GLOBAL, windowMs, now);
  if (g.length >= globalMax) return false;
  const r = recent(key, windowMs, now);
  if (r.length >= max) return false;
  r.push(now); hits.set(key, r);
  g.push(now); hits.set(GLOBAL, g);
  return true;
}

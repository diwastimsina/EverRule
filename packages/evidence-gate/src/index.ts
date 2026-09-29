// The redaction gate. Runs on every non-sample evidence file before storage and
// before any model call. Patterns, not a classifier: it exists so the pilot
// terms ("no personal or card data reaches EverRule") are enforced by software.
// Findings name the pattern and the file, never the matched value.
import type { EvidenceFile } from "@everrule/rule-schema";

export type SensitivePattern = "email" | "phone" | "card_number" | "aws_access_key" | "bearer_token" | "private_key";

export interface RedactionFinding { file: string; pattern: SensitivePattern; count: number }

const PATTERNS: { pattern: SensitivePattern; re: RegExp; validate?: (m: string) => boolean }[] = [
  { pattern: "email", re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  { pattern: "phone", re: /(?:\+?1[ .-]?)?\(?\b[2-9]\d{2}\)?[ .-]?\d{3}[ .-]?\d{4}\b/g },
  { pattern: "card_number", re: /\b(?:\d[ -]?){13,19}\b/g, validate: luhn },
  { pattern: "aws_access_key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { pattern: "bearer_token", re: /\b(?:bearer|token|api[_-]?key)\s*[:=]\s*[A-Za-z0-9._-]{20,}/gi },
  { pattern: "private_key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
];

export function scanForSensitiveData(files: EvidenceFile[]): RedactionFinding[] {
  const findings: RedactionFinding[] = [];
  for (const { name, content } of files) {
    for (const { pattern, re, validate } of PATTERNS) {
      const matches = content.match(re) ?? [];
      const count = validate ? matches.filter((m) => validate(m)).length : matches.length;
      if (count > 0) findings.push({ file: name, pattern, count });
    }
  }
  return findings;
}

export function describeFindings(findings: RedactionFinding[]): string {
  return findings.map((f) => `${f.file}: ${f.count} ${f.pattern.replace(/_/g, " ")} pattern${f.count === 1 ? "" : "s"}`).join("; ");
}

/** Throws a plain, value-free message when a file should not enter EverRule. */
export class SensitiveDataError extends Error {
  constructor(public readonly findings: RedactionFinding[]) {
    super(`Refused: the upload contains patterns that look like personal or secret data (${describeFindings(findings)}). Redact and try again.`);
  }
}

export function assertRedacted(files: EvidenceFile[]): void {
  const findings = scanForSensitiveData(files);
  if (findings.length > 0) throw new SensitiveDataError(findings);
}

function luhn(raw: string): boolean {
  const digits = raw.replace(/[ -]/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

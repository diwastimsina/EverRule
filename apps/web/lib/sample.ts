import { readFileSync } from "node:fs";
import path from "node:path";
import type { EvidenceFile } from "@everrule/rule-schema";

const DIR = path.join(process.cwd(), "..", "..", "demo-data", "procurement");
const NAMES = ["incident-summary.md", "agent-log.json", "procurement-audit.csv"];

export function sampleFiles(): EvidenceFile[] {
  return NAMES.map((name) => ({ name, content: readFileSync(path.join(DIR, name), "utf8") }));
}

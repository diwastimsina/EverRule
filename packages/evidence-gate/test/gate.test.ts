import { test } from "node:test";
import assert from "node:assert/strict";
import { assertRedacted, scanForSensitiveData, SensitiveDataError } from "../src/index";

test("clean evidence passes", () => {
  assert.deepEqual(scanForSensitiveData([{ name: "audit.csv", content: "record_type,vendor_id,amount\npurchase_order,V-1042,78000\n" }]), []);
});

test("emails, phones, Luhn-valid cards and keys are flagged by pattern and file, never by value", () => {
  const findings = scanForSensitiveData([
    { name: "export.csv", content: "customer,contact\nA,jane.doe@example.com\nB,(408) 555-0199\n" },
    { name: "notes.md", content: "card 4111 1111 1111 1111 paid; AKIAABCDEFGHIJKLMNOP; not a card 1234 5678 9012 3456" },
  ]);
  assert.deepEqual(findings.map((f) => `${f.file}:${f.pattern}:${f.count}`).sort(), ["export.csv:email:1", "export.csv:phone:1", "notes.md:aws_access_key:1", "notes.md:card_number:1"]);
  assert.ok(!JSON.stringify(findings).includes("jane.doe"));
});

test("assertRedacted throws a value-free message", () => {
  assert.throws(() => assertRedacted([{ name: "a.txt", content: "mail me at x@y.io" }]), (e: unknown) => e instanceof SensitiveDataError && !e.message.includes("x@y.io") && e.message.includes("a.txt"));
});

test("the synthetic sample incident passes the gate", async () => {
  const { readFileSync } = await import("node:fs");
  const dir = new URL("../../../demo-data/procurement/", import.meta.url);
  const files = ["incident-summary.md", "agent-log.json", "procurement-audit.csv"].map((name) => ({ name, content: readFileSync(new URL(name, dir), "utf8") }));
  assert.deepEqual(scanForSensitiveData(files), []);
});

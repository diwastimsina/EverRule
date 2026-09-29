import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, checkLoopholes, evaluate, improvedRule, naiveRule, ruleHash, standardLoopholes } from "../src/index";

const v1 = naiveRule();
const v2 = improvedRule();
const checks = checkLoopholes(v1, v2, standardLoopholes(v1));

test("thirteen cases run against the rule's own threshold", () => {
  assert.equal(checks.length, 13);
  assert.ok(checks.some((c) => c.loophole.title.includes("$50,000")));
});

test("on the first draft, only the split transaction is a loophole", () => {
  const loopholes = checks.filter((c) => c.initial_class === "loophole").map((c) => c.loophole.category);
  assert.deepEqual(loopholes, ["split_aggregate"]);
});

test("exactly at the threshold is left to the owner", () => {
  const at = checks.filter((c) => c.initial_class === "owner_decides");
  assert.equal(at.length, 1);
  assert.match(at[0]!.loophole.title, /Exactly at the threshold/);
});

test("after the fix every case holds or is left to the owner", () => {
  for (const c of checks) assert.notEqual(c.improved_class, "loophole", `${c.loophole.id}: ${c.improved.reason}`);
});

test("the evaluator denies a currency it cannot evaluate, whatever the approval", () => {
  const eur = checks.find((c) => c.loophole.category === "alternate_currency")!;
  assert.equal(eur.improved.allowed, false);
});

test("the rule hash changes on any edit, including wording", () => {
  assert.notEqual(ruleHash(v1), ruleHash(v2));
  assert.notEqual(ruleHash(v2), ruleHash({ ...v2, plain_english: v2.plain_english + " " }));
  assert.equal(ruleHash(v2), ruleHash(JSON.parse(JSON.stringify(v2))));
  assert.equal(canonicalJson({ b: 1, a: [2, { d: 3, c: 4 }] }), '{"a":[2,{"c":4,"d":3}],"b":1}');
});

test("gte makes exactly the threshold require approval", () => {
  const s = standardLoopholes(v1)[1]!.scenario;
  assert.equal(evaluate(v2.params, s).allowed, true);
  assert.equal(evaluate({ ...v2.params, operator: "gte" }, s).allowed, false);
});

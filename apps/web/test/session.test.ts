import { test } from "node:test";
import assert from "node:assert/strict";
import { passwordMatches, sessionCookie, sessionState, token } from "../lib/session";
import { mode, modelConfigured, uploadsAllowed } from "../lib/config";

const req = (cookie?: string) => new Request("http://x/api/analyze", { headers: cookie ? { cookie } : {} });

test("without a password the app is open locally and closed in production", () => {
  assert.equal(sessionState(req(), {}), "open");
  assert.equal(sessionState(req(), { VERCEL_ENV: "production" }), "misconfigured");
});

test("with a password, only the matching cookie gets in", () => {
  const env = { DEMO_PASSWORD: "hunter2" };
  assert.equal(sessionState(req(), env), "locked");
  assert.equal(sessionState(req(`everrule_session=${token("wrong")}`), env), "locked");
  assert.equal(sessionState(req(`a=1; everrule_session=${token("hunter2")}`), env), "authenticated");
  assert.equal(passwordMatches("hunter2", env), true);
  assert.equal(passwordMatches("hunter", env), false);
});

test("the cookie never contains the password and is HttpOnly", () => {
  const c = sessionCookie({ DEMO_PASSWORD: "hunter2", VERCEL_ENV: "production" });
  assert.ok(!c.includes("hunter2"));
  assert.match(c, /HttpOnly/);
  assert.match(c, /Secure/);
});

test("demo is the default; uploads and the model need llm mode", () => {
  assert.equal(mode({}), "demo");
  assert.equal(uploadsAllowed({}), false);
  assert.equal(modelConfigured({ ANTHROPIC_API_KEY: "k", EVERRULE_MODEL: "m" }), false);
  assert.equal(modelConfigured({ EVERRULE_MODE: "llm", ANTHROPIC_API_KEY: "k", EVERRULE_MODEL: "m" }), true);
  assert.equal(uploadsAllowed({ EVERRULE_MODE: "llm", DEMO_MODE: "true" }), false);
});

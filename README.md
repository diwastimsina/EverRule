# EverRule

EverRule turns a consequential AI-agent incident into an owner-approved, loophole-tested prevention rule and a customer-owned implementation artifact.

> Many agents. Many tools. One consequential effect. One explicit control.

## Status

MVP 0.1. The sample incident runs end to end: evidence, what happened, business effect, first-draft rule, 13 loophole cases, owner approval bound to the rule hash, 16 deterministic tests, the generated guard, and a pull request. Open item: the same run from a password-protected public URL.

## Run the demo

```
pnpm install
pnpm dev
```

Open http://localhost:3100 and click **Use the sample incident**. No keys are needed.

## Check everything

```
pnpm check
```

That runs typecheck, unit tests, the generated-file check, the falsification check (the generated tests pass against the generated guard and fail against a guard that does nothing), and the production build. CI runs the same steps.

## Environment

All optional locally. Copy `apps/web/.env.example` to `apps/web/.env.local`.

| Variable | Purpose |
|---|---|
| `DEMO_PASSWORD` | Gates the page and every API route. Required on any public deployment; a Vercel production deployment without it stays closed. |
| `EVERRULE_MODE` | `demo` (default, no keys) or `llm`. `llm` lets the model write the summary and first-draft rule, and allows uploads. |
| `ANTHROPIC_API_KEY`, `EVERRULE_MODEL` | Only in `llm` mode. Pin the model version. |
| `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BASE_BRANCH` | Turn "Create the pull request" into a real PR. `GITHUB_REPO` is `owner/name`. Use a fine-grained token scoped to the companion repo only, with Contents and Pull requests read and write. |

## Deploy

1. Import this repository into Vercel with the root directory `apps/web`.
2. Set `DEMO_PASSWORD`, `GITHUB_TOKEN`, `GITHUB_REPO` and `GITHUB_BASE_BRANCH=main`. Leave `EVERRULE_MODE` unset.
3. Open the production URL in a private window, enter the password, run the sample, and confirm the PR opens in the companion repository.

## What is real

- Every confirmed fact is computed from the evidence files, each fingerprinted with SHA-256.
- The rule attaches to the business effect. How the agent reached it is recorded and never read by the evaluator.
- Loophole results and test outcomes are decided by deterministic code. Test expectations come from an oracle written separately from the evaluator.
- An approval is bound to the SHA-256 of the exact rule. The PR route refuses a rule that no longer matches.
- The model, when enabled, only explains and drafts. It never confirms a fact, approves a rule, decides a test, or claims deployment.

## Folders

- `apps/web/` the Next.js app: three screens and stateless API routes.
- `packages/` rule-schema, loophole-engine, rule-tests, policy-generator.
- `demo-data/procurement/` the synthetic incident. Never customer evidence.
- `generated/` one committed run of the deterministic pipeline; CI checks it is current.
- `scripts/` the generator, the falsification check and its harness.
- `discovery/` outreach and call materials.
- Companion repo: `everrule-demo-procurement-service`, the code the generated patch applies to.

## Operating principle

Rules decide. Evidence establishes. LLMs propose. Humans authorize. The customer's own code enforces.

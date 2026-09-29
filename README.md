# EverRule

EverRule prevents organizations from learning the same expensive AI lesson twice.

When an AI agent takes a costly action it should not have, EverRule turns that incident into an owner-approved, loophole-tested prevention rule, with deterministic tests and an enforcement artifact the customer's own systems run.

## Status

Phase 0.5: working demo. One synthetic incident, upload to PR artifact, deployed from this repo. After that, Phase 1 discovery.

## Run the demo

```
pnpm install
pnpm dev
```

Open http://localhost:3100 and click **Analyze incident**. No keys needed for demo mode. To open real PRs on the companion repo, copy `apps/web/.env.example` to `apps/web/.env.local` and fill in `GITHUB_TOKEN`, `GITHUB_TARGET_OWNER` and `GITHUB_TARGET_REPO`. Use a fine-grained token scoped only to the companion repo, with Contents and Pull requests read and write.

```
pnpm typecheck && pnpm test && pnpm build && pnpm generate:check
```

## Documents

Planning documents live in `docs/` on the founder's machine and are not published in this repository.

## Folders

- `docs/` planning documents, local only and ignored by git.
- `discovery/` Phase 0 working materials: targets, outreach, script, log, scorecard.
- `apps/web/` the Next.js demo: three screens, API routes, the RuleAssistant.
- `packages/` rule-schema, loophole-engine, rule-tests, policy-generator.
- `demo-data/procurement/` the synthetic incident, three files. Never customer evidence.
- `generated/` one committed run of the deterministic pipeline; CI checks it is current.
- Companion repo: `everrule-demo-procurement-service`, the code the generated patch applies to.

## Operating principle

Rules decide. Cryptography proves integrity. Replay measures behavior. LLMs propose. Humans authorize. Customer-controlled infrastructure enforces.

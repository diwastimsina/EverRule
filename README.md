# EverRule

EverRule prevents organizations from learning the same expensive AI lesson twice.

When an AI agent takes a costly action it should not have, EverRule turns that incident into an owner-approved, loophole-tested prevention rule, with deterministic tests and an enforcement artifact the customer's own systems run.

## Status

Phase 0.5: working demo. One synthetic incident, upload to PR artifact, deployed from this repo. Definition of done and scope: `docs/everrule-solo-build-plan.md` section 4. After that, Phase 1 discovery.

## Run the demo

```
pnpm install
pnpm dev
```

Open http://localhost:3100 and click **Analyze incident**. Details in `docs/demo.md`; how it fits together in `docs/architecture.md`.

```
pnpm typecheck && pnpm test && pnpm build && pnpm generate:check
```

## Documents

Canonical hierarchy when documents differ, highest first:

1. `docs/everrule-simple.md` - company, product, customer experience
2. `docs/everrule-solo-build-plan.md` - what gets built and when
3. `docs/everrule-prd.md` - what users need, V0/V1 requirements
4. `docs/everrule-tdd.md` - how the approved product is implemented
5. `docs/everrule-build-guide.md` - engineering sequence and stack
6. `docs/everrule-one-pager.md` - external company story

`docs/EverRule_Canonical_Documentation_v2.1.md` is the combined package with the scope rule, numeric stop rule and changelog.

## Folders

- `docs/` the canonical documents.
- `discovery/` Phase 0 working materials: targets, outreach, script, log, scorecard.
- `apps/web/` the Next.js demo: three screens, API routes, the RuleAssistant.
- `packages/` rule-schema, loophole-engine, rule-tests, policy-generator.
- `demo-data/procurement/` the synthetic incident, three files. Never customer evidence.
- `generated/` one committed run of the deterministic pipeline; CI checks it is current.
- Companion repo: `everrule-demo-procurement-service`, the code the generated patch applies to.

## Operating principle

Rules decide. Cryptography proves integrity. Replay measures behavior. LLMs propose. Humans authorize. Customer-controlled infrastructure enforces.

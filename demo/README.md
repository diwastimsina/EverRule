# EverRule reference demo

**Synthetic. Every record, name, and number here is invented. Never present this as customer evidence, and never let it stand in for a real incident in a pilot.**

Shows the shape of one EverRule deliverable, end to end, using the procurement example from the solo build plan.

```
recorded incident (fixtures/incident-482.json)
  -> service that owns the effect (src/purchase-orders.ts)
  -> initial rule v1 and approved rule v2 (src/rules.ts)
  -> 9 loophole cases (test/loopholes.test.ts)
  -> deterministic tests (test/rule.test.ts, test/incident.test.ts)
  -> enforcement patch (proof/enforcement/)
  -> proof report (proof/README.md)
```

## Run

```
npm install
npm test        # 19 deterministic tests
npm run replay  # replays INC-482 through the guarded service
```

To see the incident reproduce, check out commit `28c600f` and run the same two commands.

## What this is not

No CLI, no database, no login, no integrations, no live model call. The "agent" is a replay of one recorded tool call. Build cap per the build guide: 3 to 4 hours.

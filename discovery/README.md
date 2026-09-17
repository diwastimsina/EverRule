# Phase 0 discovery kit

Everything needed for the six-week market test in `docs/everrule-solo-build-plan.md`, section 3 and appendix A. Nothing here is product.

## The test

25 qualified calls in weeks 1 to 4. Decide at the end of week 6. Continue only if all three hold:

- at least 5 companies confirm an AI-agent incident with measurable economic impact in the last 12 months (real incidents only);
- at least 3 name a realistic enforcement destination;
- at least 1 commits to a paid $15K pilot.

Other-automation incidents (RPA bots, scheduled jobs, rule-based workflows) are recorded on their own line and never count toward the 5. Scenarios never count. If the numbers fail, park EverRule and re-run 10 calls in nine months.

## Files

| File | Use |
|---|---|
| `lead-sources.md` | Where money-moving agents run, ranked by expected hit rate. Read once. |
| `targets.csv` | The 50 names. Fill before sending the first message. |
| `outreach.md` | The message, subject lines per workflow, follow-up rule. |
| `discovery-script.md` | The 25-minute call. Print it. |
| `discovery-log.csv` | One row per call, filled within 30 minutes of hanging up. |
| `intake-template.md` | One copy per incident once a pilot starts. |
| `scorecard.csv` | One row per week. Eleven numbers, nothing else. |

## Week 1

1. Fill `targets.csv` to 50 rows.
2. Send 15 messages from `outreach.md`.
3. Book calls. Log every reply in `scorecard.csv`.

## Weekly cadence at 12 hours

- 5 hours outreach and calls;
- 4 hours manual incident work, or a tiny tool that removes a pain felt twice;
- 2 hours delivery writing and one short public post a month;
- 1 hour scorecard and assumption updates.

If calls fall below three a week for two weeks, stop building until they recover.

## Money rule

Keep current income until two pilots are paid and one annual contract is committed.

## Privacy

`targets.csv` and `discovery-log.csv` will hold names of real people and verbatim quotes. Keep this repo private. Never push it to a public remote, and never paste log rows into a model prompt without removing names first.

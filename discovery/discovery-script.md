# Discovery call, 25 minutes

Facts first, demo second. Ask the three counts and the loss figure in the first ten minutes, before any screen share. Log answers within 30 minutes of the call, verbatim where you can. Record the loss figure exactly as they said it.

## Open (2 minutes)

Thanks for the time. I'm interviewing people who own [workflow or platform] at companies running AI agents. No pitch. I'll share what I learn from the other interviews. Fine to take notes?

## Facts (8 minutes), operations owners

**1.** In the last 12 months, has an AI agent's action in [workflow] cost you money? How much, and how many times?

**2.** Separately: has a coding agent or an AI-written change caused an incident on your side? What did it cost?

**3.** Separately again: has other automation, such as an RPA bot or a scheduled job, done so? This one is recorded and never counted.

**4.** When it happened, what did you change so it could not happen again, and where does that control live today?

## Facts (8 minutes), platform and developer-tooling leads

**1.** In the last 12 months, did a coding agent or an AI-written change cause an incident that cost you time or money? What happened, and what did it cost?

**2.** Separately: has an AI agent in an operational workflow (refunds, payments, procurement) caused a loss your company knows about?

**3.** Separately again: has other automation caused one? Recorded, never counted.

**4.** What did you change so it cannot recur, and where does that live today: a test, a CI gate, a lint rule, a policy, a person?

## Depth (5 minutes), both

**5.** What evidence exists after an incident: traces, tool logs, approval records, the PR, CI logs, a postmortem?

**6.** Who decides the rule, and who implements it?

**7.** Would you accept a pull request that adds a guard and a regression test, or do you need the rule in a gateway or policy engine?

**8.** What cannot leave your environment?

## Demo (5 minutes), only after the facts

Share the public URL. Run the sample. Stop at three moments:

1. The business effect beside how the agent got there: the rule attaches to the effect.
2. The loophole check: two $40,000 orders pass a single-order $50,000 rule.
3. The pull request: the customer's own code enforces it. EverRule is not in the transaction path.

## Close (3 minutes)

**Operations:** If we took three past incidents and delivered a reconstruction, an approved rule, a tested change and an evidence package in three weeks for $15,000, what would need to be true for you to say yes, and who would fund it?

**Developer:** If we took three past incidents and delivered that in three weeks, what would it need to cost, and who owns the budget?

Who else should I talk to?

## After the call

- One row in `discovery-log.csv` within 30 minutes.
- Update the status and counts in `targets.csv`.
- A count is 1 or more only for a real incident with a stated cost. Scenarios are 0.
- Send the thank-you and any promised intro the same day.

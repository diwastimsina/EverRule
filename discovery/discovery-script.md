# Discovery call, 25 minutes

Ask the two killer questions first, in order. Do not pitch. Log answers within 30 minutes of the call, verbatim where you can. Record the loss figure exactly as they said it.

## Open (2 minutes)

Thanks for the time. I'm interviewing people who own [workflow] at companies running AI agents. No pitch. I'll share what I learn from the other interviews. Fine to record notes?

## Killer questions (8 minutes)

**1.** In the last 12 months, has an AI agent's action in [workflow] cost you money? How much, and how many times?

Then, separately: has any other automation, such as an RPA bot or a scheduled job, done so? Record that count on its own line. It does not count toward H1.

**2.** When it happened, what did you change so it could not happen again, and where does that control live today?

## Depth (12 minutes)

**3.** What can the agent do today without a person approving each action?

**4.** What is the most expensive single action it could take?

**5.** What evidence exists after an incident: traces, tool logs, approval records, a postmortem?

**6.** Who decides the rule, and who implements it?

**7.** How long did it take from incident to control last time?

**8.** Would you accept a pull request into your service, or do you need the rule in a gateway or policy engine?

**9.** What cannot leave your environment?

## Close (3 minutes)

**10.** If we took three past incidents and delivered a reconstruction, an approved rule, a tested change, and an evidence package in three weeks for $15,000, what would need to be true for you to say yes, and who would fund it?

Who else should I talk to?

## After the call

- Fill one row in `discovery-log.csv` within 30 minutes.
- Update `targets.csv` status and H1, H2, H3 columns.
- H1 is yes only for a real AI-agent incident with a stated economic figure. Scenarios are no. Other automation goes in its own column.
- Send the thank-you and any promised intro the same day.

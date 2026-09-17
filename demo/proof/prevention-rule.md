# ER-PROC-019, the prevention rule

**Synthetic reference demo. Not customer evidence.**

## Initial rule (v1, before the loophole check)

> Purchases above $50,000 require approval.

## Approved rule (v2)

> Aggregate commitments to the same vendor above $50,000 within 24 hours require a valid director approval scoped to that vendor and commitment.

A valid approval means all of the following:

- issued by a director who is not the requester;
- names the same vendor;
- in the same currency;
- has a cap at or above the aggregate commitment;
- was issued before the request and has not expired;
- has not been used before.

If any required evidence is missing, the order is refused. Missing is never treated as fine.

## What changed and why

The v1 rule looked at one order at a time. The loophole check showed two $40,000 orders to the same vendor pass v1 and still commit $80,000. The business owner rescoped the rule to the vendor's rolling 24-hour commitment. Full approval record is in `prevention-rule.json`.

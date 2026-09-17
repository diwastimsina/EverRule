## ER-PROC-019: vendor commitments above $50,000 in 24h require valid director approval

**Synthetic reference demo.**

**Source incident:** INC-482 (PO-88219, $78,000, 2026-08-17)
**Rule approved by:** J. Ellis, Director of Procurement Operations, 2026-09-16
**Change:** guard in `createPurchaseOrder`; `RuleViolation` thrown when the rolling 24h vendor aggregate exceeds $50,000 without a valid director approval, or when required evidence is missing.
**Tests:** original incident case, 9 loophole cases, 9 rule cases. Incident case fails on parent commit 28c600f, passes on this branch.
**Not covered:** delegated approvals, multi-currency totals, vendor identity collisions, cross-requester splits. See `proof/limitations.md`.
**Deployment:** this patch is exported. Deployment status stays unconfirmed until merged and confirmed by the customer.

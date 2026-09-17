# INC-482 proof report

**Synthetic reference demo. Every record is invented. Never present this as customer evidence.**

## 1. What happened

On 2026-08-17 at 14:02 UTC the procurement agent (in-house, version 2026.08.1) called `createPurchaseOrder` for $78,000 to vendor VEND-2291. The service created PO-88219. No approval record exists for that vendor in the approval system for August. Two days later accounts payable cancelled the order.

| Claim | Status | Evidence |
|---|---|---|
| Agent created PO-88219 for $78,000 USD | Confirmed | EV-01 |
| No approval existed for VEND-2291 | Confirmed | EV-02 |
| Order cancelled 2026-08-19 with a $2,100 fee | Confirmed | EV-03 |
| Why the agent chose this amount | Not verifiable | prompt and policy text not supplied |

## 2. Business impact

| Category | Amount | Status |
|---|---|---|
| Unauthorized exposure | $78,000 | Confirmed |
| Realized loss | $2,100 cancellation fee | Confirmed |
| Remediation cost | unknown | Not verifiable |
| Customer credits | $0 | Confirmed |
| Operational cost | unknown | Not verifiable |

The $78,000 is exposure the business did not authorize. It is not a $78,000 loss.

## 3. Prevention rule

Initial: purchases above $50,000 require approval.

Approved: aggregate commitments to the same vendor above $50,000 within 24 hours require a valid director approval scoped to that vendor and commitment. Missing evidence means refuse.

Approved by J. Ellis, Director of Procurement Operations (synthetic), 2026-09-16. Rationale and edited fields in `prevention-rule.json`.

## 4. Loopholes found

Nine cases satisfied the initial rule while violating its intent. The split-order case (two $40,000 orders) changed the rule's scope. The other eight tightened what counts as a valid approval. Full table in `loopholes.md`.

## 5. Protection and test results

- Guard added inside `createPurchaseOrder`, the code that owns the effect. Patch: `enforcement/0001-*.patch`.
- 19 deterministic tests: the original incident, 9 loophole cases, legitimate, prohibited, boundary, and missing-evidence cases. All pass. Details in `tests.md`.
- The original incident test fails on the commit before the guard and passes after it.
- The protection keeps working if EverRule is never contacted again.

Limitations in `limitations.md`. File hashes in `hashes.sha256`.

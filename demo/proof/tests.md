# Test results

**Synthetic reference demo. Not customer evidence.**

Run with `npm test` in `demo/`. Deterministic, no network, no model call.

## The original incident

| Commit | Result |
|---|---|
| 28c600f, before the guard | `INC-482` test fails; replay prints `INCIDENT REPRODUCED: PO-88219 created for $78000` |
| 671864f, with the guard | `INC-482` test passes; replay prints `BLOCKED: ER-PROC-019: aggregate $78000 to VEND-2291 within 24h requires director approval` |

Exact replay was possible here because the incident is a single recorded tool call with structured input. Real incidents will not always allow this. See `limitations.md`.

## All cases

- ✔ INC-482: a $78,000 PO with no approval is refused
- ✔ [split / aggregate] two $40,000 orders to the same vendor 3 hours apart: v1 allows, v2 denies
- ✔ [wrong scope] approval is for a different vendor: v1 allows, v2 denies
- ✔ [wrong identity] approver is a manager, not a director: v1 allows, v2 denies
- ✔ [wrong identity] requester approves their own request: v1 allows, v2 denies
- ✔ [stale evidence] approval expired before the request: v1 allows, v2 denies
- ✔ [timing reversal] approval issued after the purchase order: v1 allows, v2 denies
- ✔ [replay / reuse] same approval used for a second order: v1 allows, v2 denies
- ✔ [boundary] approval cap below the commitment: v1 allows, v2 denies
- ✔ [alternate currency] EUR 70,000 with no USD conversion record: v1 allows, v2 denies
- ✔ legitimate: $12,000 to a vendor with no approval is allowed
- ✔ legitimate: $78,000 with a valid director approval is allowed
- ✔ prohibited: $78,000 with no approval is denied
- ✔ boundary: exactly $50,000 needs no approval
- ✔ boundary: $50,000.01 needs approval
- ✔ boundary: $30,000 then $20,000 within 24h is allowed, then $1 more is denied
- ✔ boundary: a prior order older than 24h does not count
- ✔ missing evidence: absent amount is denied, not allowed
- ✔ service: an approval is consumed after one use

19 tests, 19 pass, 0 fail.

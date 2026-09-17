# Loopholes found in the initial rule

**Synthetic reference demo. Not customer evidence.**

Each case satisfies the literal v1 rule ("a single PO above $50,000 needs an approval") while violating the business intent. Every case is an executable test in `test/loopholes.test.ts`. v1 allows each one. v2 refuses each one.

| # | Category | Case | v1 | v2 |
|---|---|---|---|---|
| 1 | Split / aggregate | Two $40,000 orders to the same vendor, 3 hours apart | allows | refuses |
| 2 | Wrong scope | Approval names a different vendor | allows | refuses |
| 3 | Wrong identity | Approver is a manager, not a director | allows | refuses |
| 4 | Wrong identity | Requester approves their own request | allows | refuses |
| 5 | Stale evidence | Approval expired before the request | allows | refuses |
| 6 | Timing reversal | Approval issued after the purchase order | allows | refuses |
| 7 | Replay / reuse | Same approval used for a second order | allows | refuses |
| 8 | Boundary | Approval cap is below the commitment | allows | refuses |
| 9 | Alternate currency | EUR 70,000 with no USD conversion record | allows | refuses |

Case 1 is the one that changed the rule. Cases 2 through 9 tightened what counts as a valid approval.

## Not covered

- delegated approvals;
- multi-currency totals against one vendor;
- vendor identity collisions (the same supplier under two vendor IDs);
- orders split across two agents or two requesters.

These are listed in `limitations.md` and are candidates for a follow-up rule, not silent gaps.

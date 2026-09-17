# Limitations

**Synthetic reference demo. Not customer evidence.**

- Every record here is invented. Nothing was taken from a customer.
- The agent is a scripted replay of one recorded tool call. No live model was run, so this says nothing about how often an agent would attempt the action. Deterministic tests validate the rule, not the agent.
- Exact replay worked because the incident was one structured tool call. Where a real incident cannot be reproduced exactly, EverRule builds the smallest deterministic reproduction the evidence supports and says so.
- The $50,000 threshold and the 24-hour window are the business owner's choices, not facts in the evidence.
- Not covered by ER-PROC-019 v2: delegated approvals, multi-currency totals, vendor identity collisions, orders split across requesters.
- Remediation cost and operational cost are not verifiable from the supplied evidence and are left blank rather than estimated.
- The guard lives in the service's own code. If the agent has another path to create purchase orders that does not go through `createPurchaseOrder`, the guard does not apply. Confirming there is no such path is a customer task.
- SHA-256 hashes in `hashes.sha256` are integrity fingerprints. They do not prove authorship, time, or non-repudiation.

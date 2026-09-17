// SYNTHETIC reference demo. Builders for test requests.
import type { Approval, PurchaseOrderRequest } from "../src/types.js";

export const T0 = "2026-08-17T14:00:00Z";
const plus = (iso: string, hours: number) => new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();
export const at = (hours: number) => plus(T0, hours);

export function approval(over: Partial<Approval> = {}): Approval {
  return {
    approval_id: "APR-1001",
    approver_id: "dir-ellis",
    approver_role: "director",
    vendor_id: "VEND-2291",
    amount_cap: 80_000,
    currency: "USD",
    issued_at: at(-2),
    expires_at: at(+72),
    ...over,
  };
}

export function request(over: Partial<PurchaseOrderRequest> = {}): PurchaseOrderRequest {
  return {
    requester_id: "procurement-agent",
    vendor_id: "VEND-2291",
    amount: 78_000,
    currency: "USD",
    requested_at: T0,
    ...over,
  };
}

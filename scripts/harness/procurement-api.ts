// SYNTHETIC in-memory stand-in for a procurement API. Not a real system.

export interface Approval {
  approval_id: string;
  approver_id: string;
  approver_role: "director" | "manager" | "analyst";
  vendor_id: string;
  amount_cap: number;
  currency: "USD" | "EUR";
  valid: boolean;
  references_commitment: string | null;
  issued_at: string;
  expires_at: string;
}

export interface PurchaseOrderRequest {
  commitment_id: string;
  requester_id: string;
  vendor_id: string;
  amount?: number;
  currency: "USD" | "EUR";
  requested_at: string;
  approval?: Approval;
}

interface State {
  prior: { vendor_id: string; amount: number; hours_before: number }[];
  used: string[];
}

let state: State = { prior: [], used: [] };
let seq = 88218;

export const procurementApi = {
  async create(po: PurchaseOrderRequest) {
    seq += 1;
    if (po.approval) state.used.push(po.approval.approval_id);
    return { po_id: `PO-${seq}`, status: "created" as const, ...po };
  },
  /** Sum of commitments to the vendor inside the window ending at `asOf`. */
  async vendorCommitment(vendor_id: string, _asOf: string, windowHours: number): Promise<number> {
    return state.prior
      .filter((o) => o.vendor_id === vendor_id && o.hours_before >= 0 && o.hours_before < windowHours)
      .reduce((s, o) => s + o.amount, 0);
  },
  async approvalUsed(approval_id: string): Promise<boolean> {
    return state.used.includes(approval_id);
  },
  /** Test hook. */
  __reset(next: Partial<State> = {}) {
    state = { prior: next.prior ?? [], used: next.used ?? [] };
  },
};

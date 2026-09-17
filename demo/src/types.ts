// SYNTHETIC reference demo. Every record here is invented.

export type Currency = "USD" | "EUR";

export interface Approval {
  approval_id: string;
  approver_id: string;
  approver_role: "director" | "manager" | "analyst";
  vendor_id: string;
  amount_cap: number;
  currency: Currency;
  issued_at: string; // ISO 8601
  expires_at: string; // ISO 8601
}

export interface PurchaseOrderRequest {
  requester_id: string;
  vendor_id: string;
  amount: number;
  currency: Currency;
  requested_at: string; // ISO 8601
  approval?: Approval;
}

export interface PurchaseOrder extends PurchaseOrderRequest {
  po_id: string;
  created_at: string;
}

export interface Decision {
  allowed: boolean;
  reason: string;
}

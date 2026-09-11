// Thin fetch wrapper over the Consentia backend (proxied at /v1 in dev, see vite.config.ts).

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 403) {
    throw new Error(body?.error ?? `Request failed: ${res.status}`);
  }
  return body as T;
}

export type Purpose = {
  id: string;
  code: string;
  name: string;
  description: string;
  legalBasis: "CONSENT" | "LEGAL_OBLIGATION" | "CONTRACT";
  category: string;
  defaultValidityDays: number;
};

export type Customer = {
  id: string;
  externalRef: string;
  displayName: string;
  preferredLanguage: string;
  dob: string | null;
  isMinor: boolean;
  guardianVerified: boolean;
  guardianMethod: string;
  createdAt: string;
};

export type ConsentEvent = {
  id: string;
  action: "GRANT" | "WITHDRAW" | "EXPIRE";
  channel: string;
  noticeVersion: string;
  language: string;
  verificationMethod: string;
  receiptId: string;
  createdAt: string;
  customer: Customer;
  purpose: Purpose;
};

export type ConsentState = {
  id: string;
  status: "VALID" | "WITHDRAWN" | "EXPIRED" | "PENDING" | "MINOR_BLOCKED";
  grantedAt: string | null;
  expiresAt: string | null;
  withdrawnAt: string | null;
  updatedAt: string;
  customer: Customer;
  purpose: Purpose;
};

export type CheckResponse = {
  decision: "ALLOW" | "BLOCK";
  reason: string;
  policy_version: string;
  decision_id: string;
  latency_ms: number;
};

export type Command = {
  id: string;
  status: "PENDING" | "DISPATCHED" | "ACKED" | "RETRYING" | "DEAD_LETTER";
  attempts: number;
  lastError: string | null;
  owner: string | null;
  createdAt: string;
  updatedAt: string;
  connector: Connector;
};

export type Connector = {
  id: string;
  name: string;
  type: string;
  health: "UP" | "DEGRADED" | "DOWN";
  latencyMs: number;
  simulateFail: boolean;
  dpaExpiresAt: string | null;
};

export type AuditEvent = {
  id: string;
  seq: number;
  entryType: string;
  actor: string;
  summary: string;
  payloadJson: unknown;
  prevHash: string;
  hash: string;
  createdAt: string;
};

export type DriveT = {
  id: string;
  name: string;
  audience: string;
  channels: string[];
  status: "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  targeted: number;
  responses: number;
  approved: number;
  rejected: number;
  purpose: Purpose;
  createdAt: string;
};

export type DSR = {
  id: string;
  type: "ACCESS" | "CORRECTION" | "ERASURE" | "GRIEVANCE" | "NOMINATION";
  status: "RECEIVED" | "VERIFYING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  dueAt: string;
  createdAt: string;
  customer: Customer;
};

export const api = {
  dashboard: () => req<{ held: number; withdrawn: number; expiringSoon: number; dlqOpen: number; recentEvents: ConsentEvent[] }>("/v1/dashboard"),
  consentHealth: () =>
    req<{ score: number; total: number; buckets: Record<string, number>; byPurpose: { purpose: string; total: number; valid: number; pct: number }[] }>(
      "/v1/consent-health",
    ),
  purposes: () => req<Purpose[]>("/v1/purposes"),
  customers: () => req<Customer[]>("/v1/customers"),
  customerConsents: (ref: string) =>
    req<Customer & { consentStates: ConsentState[]; consentEvents: ConsentEvent[] }>(`/v1/customers/${ref}/consents`),
  consentEvents: (limit = 50) => req<ConsentEvent[]>(`/v1/consent-events?limit=${limit}`),
  consentStates: () => req<ConsentState[]>("/v1/consent-states"),
  check: (input: { customer_ref: string; purpose: string; system: string; context?: unknown }) =>
    req<CheckResponse>("/v1/consent/check", { method: "POST", body: JSON.stringify(input) }),
  capture: (input: { customer_ref: string; purpose: string; channel: string; notice_version: string; language: string; verification_method: string }) =>
    req<{ event_id: string; receipt_id: string; state: ConsentState }>("/v1/consents", { method: "POST", body: JSON.stringify(input) }),
  withdraw: (input: { customer_ref: string; purpose: string; actor?: string }) =>
    req<{ event_id: string; receipt_id: string; fan_out: unknown }>("/v1/consents/withdraw", { method: "POST", body: JSON.stringify(input) }),
  permissions: () =>
    req<{ connectors: string[]; grid: { purpose: string; purposeCode: string; legalBasis: string; cells: { connector: string; status: string; reason: string }[] }[] }>(
      "/v1/permissions",
    ),
  commands: (status?: string) => req<Command[]>(`/v1/commands${status ? `?status=${status}` : ""}`),
  replayCommand: (id: string) => req<{ replayed: boolean }>(`/v1/commands/${id}/replay`, { method: "POST" }),
  connectors: () => req<Connector[]>("/v1/connectors"),
  audit: (limit = 100) => req<AuditEvent[]>(`/v1/audit?limit=${limit}`),
  auditVerify: () => req<{ ok: boolean; brokenAtSeq: number | null; entries: number }>("/v1/audit/verify"),
  drives: () => req<DriveT[]>("/v1/drives"),
  createDrive: (input: { name: string; purpose: string; audience: string; channels: string[]; scheduled_at?: string }) =>
    req<DriveT>("/v1/drives", { method: "POST", body: JSON.stringify(input) }),
  driveAction: (id: string, action: "pause" | "resume" | "cancel") => req<DriveT>(`/v1/drives/${id}/${action}`, { method: "POST" }),
  dsrList: () => req<DSR[]>("/v1/dsr"),
  createDsr: (input: { customer_ref: string; type: DSR["type"]; sla_days?: number }) =>
    req<DSR>("/v1/dsr", { method: "POST", body: JSON.stringify(input) }),
};

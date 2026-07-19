/**
 * Server-side client for the AurumTrace API. (Only imported from Server
 * Components / Server Actions — never ship the auth headers to the browser.)
 * Real tenant data flows only
 * through here. Auth: in dev (AT_DEV_* set) we send x-debug-* headers matching
 * the API's AUTH_DEV_MODE; in production this attaches the user's Supabase JWT
 * (TODO once web sessions are wired). When NEXT_PUBLIC_API_URL is unset, callers
 * fall back to mock data so the UI still runs.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function apiConfigured(): boolean {
  return Boolean(API_URL);
}

function authHeaders(): Record<string, string> {
  const user = process.env.AT_DEV_USER;
  const tenant = process.env.AT_DEV_TENANT;
  if (user && tenant) {
    return {
      "x-debug-user": user,
      "x-debug-tenant": tenant,
      "x-debug-role": process.env.AT_DEV_ROLE ?? "compliance_officer",
    };
  }
  return {};
}

export async function apiGet<T>(path: string): Promise<T | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  if (!API_URL) throw new Error("API not configured (NEXT_PUBLIC_API_URL)");
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export type ApiCaseRow = {
  id: string;
  reference: string;
  customer: string | null;
  item: string | null;
  valueFils: number | null;
  stage: number;
  status: string;
  createdAt: string;
};

export type ApiScreeningResult = {
  screening: {
    sanctionsMatch: boolean;
    pepMatch: boolean;
    adverseMedia: boolean;
    identityVerified: boolean;
    source: string;
  };
  risk: {
    score: number;
    band: "low" | "medium" | "high";
    forcedHigh: boolean;
    provisional: boolean;
    factors: { code: string; label: string; points: number }[];
  };
};

export type ApiSourcingResult = {
  risk: "low" | "medium" | "high";
  completedSteps: number;
  reasons: string[];
  provisional: boolean;
};

export type ApiUploadedDocument = {
  id: string;
  kind: string;
  filename: string;
  contentHash: string;
  sizeBytes: number;
};

export type ApiDashboardSummary = {
  kpis: {
    casesToday: number;
    reportsPending: number;
    flaggedCustomers: number;
    filingsMonth: number;
  };
  pipeline: { stage: number; count: number }[];
};

export type ApiCustomerRow = {
  id: string;
  fullName: string;
  emiratesId: string | null;
  residencyStatus: string | null;
  riskRating: string;
  caseCount: number;
  lastSeen: string | null;
};

export type ApiReportRow = {
  id: string;
  reference: string | null;
  reportType: string;
  status: string;
  valueFils: number | null;
  customer: string | null;
};

export type ApiAuditEntry = {
  id: string;
  seq: number;
  event: string;
  actorId: string | null;
  resourceType: string | null;
  caseId: string | null;
  createdAt: string;
  hash: string;
  prevHash: string;
};

export type ApiChainVerification =
  | { ok: true; length: number }
  | { ok: false; brokenAt: number; reason: string };

export type ApiReportDraft = {
  id: string;
  reference: string;
  status: string;
  valueFils: number;
  xml: string;
  narrative: string;
  validation: { valid: boolean; missing: string[]; provisional: boolean };
  provisional: boolean;
};

export type ApiFiledReport = { id: string; status: string; filedAt: string };

export type ApiIntakeResult = {
  case: { id: string; reference: string; stage: number; status: string };
  customer: { id: string; fullName: string };
  item: { id: string; valueFils: number };
  valuation: { filsPerGram: number; purityKarat: number; asOf: string; source: string };
};

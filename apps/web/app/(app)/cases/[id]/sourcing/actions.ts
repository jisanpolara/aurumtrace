"use server";

import {
  apiPost,
  type ApiSourcingResult,
  type ApiUploadedDocument,
} from "@/lib/api";

export type OecdSteps = {
  managementSystems: boolean;
  riskAssessment: boolean;
  riskStrategy: boolean;
  audit: boolean;
  reporting: boolean;
};

export type SourcingActionResult =
  | { ok: true; result: ApiSourcingResult }
  | { ok: false; error: string };

export async function submitSourcingAction(
  caseId: string,
  input: { declarationType: string; steps: OecdSteps },
): Promise<SourcingActionResult> {
  try {
    const result = await apiPost<ApiSourcingResult>(`/cases/${caseId}/sourcing`, input);
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sourcing failed" };
  }
}

export type UploadActionResult =
  | { ok: true; doc: ApiUploadedDocument }
  | { ok: false; error: string };

export async function uploadDocumentAction(
  caseId: string,
  input: { kind: string; filename: string; contentBase64: string },
): Promise<UploadActionResult> {
  try {
    const doc = await apiPost<ApiUploadedDocument>(`/cases/${caseId}/documents`, input);
    return { ok: true, doc };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed" };
  }
}

"use server";

import { apiPost, type ApiReportDraft, type ApiFiledReport } from "@/lib/api";

export type DraftActionResult =
  | { ok: true; draft: ApiReportDraft }
  | { ok: false; error: string };

export async function draftReportAction(caseId: string): Promise<DraftActionResult> {
  try {
    return { ok: true, draft: await apiPost<ApiReportDraft>(`/cases/${caseId}/report`, {}) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Draft failed" };
  }
}

export type FileActionResult =
  | { ok: true; filed: ApiFiledReport }
  | { ok: false; error: string };

export async function fileReportAction(reportId: string): Promise<FileActionResult> {
  try {
    return { ok: true, filed: await apiPost<ApiFiledReport>(`/reports/${reportId}/file`, {}) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Filing failed" };
  }
}

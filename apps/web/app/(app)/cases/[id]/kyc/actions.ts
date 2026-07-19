"use server";

import { apiPost, type ApiScreeningResult } from "@/lib/api";

export type ScreeningActionResult =
  | { ok: true; result: ApiScreeningResult }
  | { ok: false; error: string };

export async function runScreeningAction(caseId: string): Promise<ScreeningActionResult> {
  try {
    const result = await apiPost<ApiScreeningResult>(`/cases/${caseId}/screening`, {});
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Screening failed" };
  }
}

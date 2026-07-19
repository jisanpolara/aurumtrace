"use server";

import { apiPost, type ApiIntakeResult } from "@/lib/api";

export type IntakeInput = {
  idImageRef: string;
  item: {
    itemType: string;
    purityKarat: number;
    weightGrams: number;
    transactionType: string;
  };
};

export type IntakeActionResult =
  | { ok: true; result: ApiIntakeResult }
  | { ok: false; error: string };

export async function createCaseAction(input: IntakeInput): Promise<IntakeActionResult> {
  try {
    const result = await apiPost<ApiIntakeResult>("/intake/cases", input);
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Intake failed" };
  }
}

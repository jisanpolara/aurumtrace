import { z } from "zod";

export const ScreeningSubject = z.object({
  fullName: z.string().min(1),
  dateOfBirth: z.string().date().nullable().optional(),
  nationality: z.string().nullable().optional(),
});
export type ScreeningSubject = z.infer<typeof ScreeningSubject>;

export const ScreeningHit = z.object({
  list: z.string(),
  matchName: z.string(),
  score: z.number().min(0).max(1),
});
export type ScreeningHit = z.infer<typeof ScreeningHit>;

/** Sanctions / PEP / adverse-media / identity outcome for a subject. */
export const ScreeningOutcome = z.object({
  sanctionsMatch: z.boolean(),
  pepMatch: z.boolean(),
  adverseMedia: z.boolean(),
  /** Identity confirmed (e.g. Emirates ID biometric / liveness). */
  identityVerified: z.boolean(),
  hits: z.array(ScreeningHit),
  checkedAt: z.string().datetime(),
  source: z.string().min(1),
});
export type ScreeningOutcome = z.infer<typeof ScreeningOutcome>;

export interface ScreeningAdapter {
  screen(subject: ScreeningSubject): Promise<ScreeningOutcome>;
}

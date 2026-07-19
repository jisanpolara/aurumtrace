import { type ScreeningAdapter, type ScreeningOutcome, type ScreeningSubject } from "./types";

/** Deterministic screening for dev/tests — returns a clean (no-match) outcome. */
export class MockScreeningAdapter implements ScreeningAdapter {
  async screen(_subject: ScreeningSubject): Promise<ScreeningOutcome> {
    return {
      sanctionsMatch: false,
      pepMatch: false,
      adverseMedia: false,
      identityVerified: true,
      hits: [],
      checkedAt: new Date().toISOString(),
      source: "mock",
    };
  }
}

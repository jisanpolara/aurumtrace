/**
 * Guardrail (CLAUDE.md): never send raw PII to an LLM/provider without the
 * data-handling flag set. Every LLM adapter MUST call `assertPiiAllowed` before
 * dispatching a request. Default-deny: if a request is marked `no_pii` and any
 * detector fires, the call throws rather than leaking.
 */

export type DataHandling = "no_pii" | "pii_authorised";

export class PiiNotAuthorisedError extends Error {
  constructor(public readonly kinds: string[]) {
    super(`request marked 'no_pii' but contains likely PII: ${kinds.join(", ")}`);
    this.name = "PiiNotAuthorisedError";
  }
}

const DETECTORS: { kind: string; re: RegExp }[] = [
  { kind: "emirates_id", re: /\b784-?\d{4}-?\d{7}-?\d\b/ },
  { kind: "email", re: /[\w.+-]+@[\w-]+\.[\w.-]+/ },
  { kind: "uae_phone", re: /\b(?:\+?971|0)\d{8,9}\b/ },
  { kind: "long_digit_run", re: /\b\d{12,}\b/ },
];

/** Return the kinds of PII detected in `text` (best-effort, deny-leaning). */
export function scanForPii(text: string): string[] {
  return DETECTORS.filter((d) => d.re.test(text)).map((d) => d.kind);
}

/** Throw unless PII is authorised or none is detected across the given texts. */
export function assertPiiAllowed(dataHandling: DataHandling, ...texts: string[]): void {
  if (dataHandling === "pii_authorised") return;
  const found = [...new Set(texts.flatMap(scanForPii))];
  if (found.length > 0) throw new PiiNotAuthorisedError(found);
}

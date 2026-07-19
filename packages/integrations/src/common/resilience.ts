/** Cross-provider resilience: per-attempt timeout + bounded retry with backoff. */

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`operation timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

export class ProviderError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(`[${provider}] ${message}`);
    this.name = "ProviderError";
  }
}

export type ResilienceOptions = {
  /** Number of retries after the first attempt (default 2 → up to 3 tries). */
  retries?: number;
  /** Per-attempt timeout in ms (default 5000). */
  timeoutMs?: number;
  /** Base backoff in ms; doubles each retry (default 100). */
  baseDelayMs?: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run `op` with a per-attempt timeout and exponential-backoff retries. `op`
 * receives an AbortSignal it should forward to fetch so a timed-out attempt is
 * actually cancelled. The last error is thrown if all attempts fail.
 */
export async function withResilience<T>(
  op: (signal: AbortSignal) => Promise<T>,
  opts: ResilienceOptions = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  const timeoutMs = opts.timeoutMs ?? 5000;
  const baseDelayMs = opts.baseDelayMs ?? 100;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new TimeoutError(timeoutMs)), timeoutMs);
    try {
      return await op(controller.signal);
    } catch (err) {
      lastErr = controller.signal.aborted ? controller.signal.reason ?? new TimeoutError(timeoutMs) : err;
      if (attempt < retries) await sleep(baseDelayMs * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

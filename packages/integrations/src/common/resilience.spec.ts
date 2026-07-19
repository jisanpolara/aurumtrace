import { TimeoutError, withResilience } from "./resilience";

describe("withResilience", () => {
  it("returns on first success", async () => {
    let calls = 0;
    const r = await withResilience(async () => {
      calls++;
      return 42;
    });
    expect(r).toBe(42);
    expect(calls).toBe(1);
  });

  it("retries then succeeds", async () => {
    let calls = 0;
    const r = await withResilience(
      async () => {
        calls++;
        if (calls < 3) throw new Error("transient");
        return "ok";
      },
      { retries: 2, baseDelayMs: 1 },
    );
    expect(r).toBe("ok");
    expect(calls).toBe(3);
  });

  it("throws the last error after exhausting retries", async () => {
    let calls = 0;
    await expect(
      withResilience(
        async () => {
          calls++;
          throw new Error("always");
        },
        { retries: 2, baseDelayMs: 1 },
      ),
    ).rejects.toThrow("always");
    expect(calls).toBe(3);
  });

  it("times out a hung attempt", async () => {
    await expect(
      withResilience(
        (signal) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => reject(signal.reason));
          }),
        { retries: 0, timeoutMs: 20 },
      ),
    ).rejects.toBeInstanceOf(TimeoutError);
  });
});
